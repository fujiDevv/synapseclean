import { extensionApi } from './platform';

async function writeViaNavigatorClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function writeViaExecCommand(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    textarea.remove();
  }
  return ok;
}

async function writeViaBackground(text: string): Promise<boolean> {
  try {
    const res = await extensionApi.runtime.sendMessage<{ success?: boolean }>({
      type: 'write-clipboard',
      text,
    });
    return res?.success === true;
  } catch {
    return false;
  }
}

/** Write text to the clipboard using every strategy available to extensions. */
export async function writeClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (await writeViaNavigatorClipboard(text)) return true;
  if (writeViaExecCommand(text)) return true;
  if (await writeViaBackground(text)) return true;

  console.warn('[SynapseClean] Clipboard write failed after all strategies');
  return false;
}