import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeClipboard } from '../src/clipboard';

const EXT_ID = 'test-extension-id';

function stubChromeSendMessage(response: { success: boolean }) {
  const sendMessage = vi.fn((_message: unknown, callback: (value: unknown) => void) => {
    callback(response);
  });
  vi.stubGlobal('chrome', {
    runtime: { id: EXT_ID, sendMessage },
  });
  return sendMessage;
}

function stubDocument(execCommandResult: boolean) {
  const execCommand = vi.fn().mockReturnValue(execCommandResult);
  const textarea = {
    value: '',
    style: {} as CSSStyleDeclaration,
    focus: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
    setAttribute: vi.fn(),
    remove: vi.fn(),
  };
  const body = { appendChild: vi.fn() };

  vi.stubGlobal('document', {
    body,
    createElement: vi.fn((tag: string) => {
      if (tag === 'textarea') return textarea;
      return {};
    }),
    execCommand,
  });

  return { execCommand, textarea, body };
}

beforeEach(() => {
  vi.stubGlobal('chrome', {
    runtime: {
      id: EXT_ID,
      sendMessage: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writeClipboard', () => {
  it('returns false for empty text', async () => {
    await expect(writeClipboard('')).resolves.toBe(false);
  });

  it('uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(writeClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const { execCommand, textarea, body } = stubDocument(true);

    await expect(writeClipboard('fallback')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(body.appendChild).toHaveBeenCalledWith(textarea);
  });

  it('falls back to background when page strategies fail', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    stubDocument(false);

    const sendMessage = stubChromeSendMessage({ success: true });

    await expect(writeClipboard('via background')).resolves.toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      { type: 'write-clipboard', text: 'via background' },
      expect.any(Function)
    );
  });

  it('returns false when every strategy fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const writeText = vi.fn().mockRejectedValue(new DOMException('NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    stubDocument(false);

    const sendMessage = stubChromeSendMessage({ success: false });

    await expect(writeClipboard('nope')).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});