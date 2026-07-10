import { MAX_GEMINI_INPUT_CHARS } from './constants';
import { buildRefinePrompts } from './refine-profiles';
import type { RefineMeta, SynapseSettings } from './types';

let mainWorldPort: MessagePort | null = null;

type LanguageModelProvider = {
  availability?: (opts?: unknown) => Promise<string>;
  create: (opts: Record<string, unknown>) => Promise<{
    prompt: (text: string) => Promise<string>;
    destroy?: () => Promise<void>;
  }>;
};

export function setMainWorldPort(port: MessagePort): void {
  mainWorldPort = port;
  mainWorldPort.start();
}

export async function checkGeminiNanoAvailability(): Promise<string> {
  const lm = (globalThis as { LanguageModel?: LanguageModelProvider }).LanguageModel;
  if (lm?.availability) {
    try {
      return await lm.availability({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
    } catch {
      // fall through
    }
  }

  if (typeof window === 'undefined') return 'unavailable';
  if (window.location.protocol.startsWith('chrome-extension:')) return 'unavailable';
  if (!mainWorldPort) return 'unavailable';

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    let resolved = false;
    const handler = (event: MessageEvent) => {
      if (resolved) return;
      if (event.data?.type !== 'SYNAPSECLEAN_AI_AVAILABILITY_RESPONSE' || event.data.id !== requestId) return;
      resolved = true;
      mainWorldPort!.removeEventListener('message', handler);
      resolve(event.data.availability ?? 'unavailable');
    };
    mainWorldPort!.addEventListener('message', handler);
    mainWorldPort!.postMessage({ type: 'SYNAPSECLEAN_AI_AVAILABILITY_REQUEST', id: requestId });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        mainWorldPort!.removeEventListener('message', handler);
        resolve('unavailable');
      }
    }, 2500);
  });
}

export async function promptGeminiNano(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const lm =
    (globalThis as { ai?: { languageModel?: LanguageModelProvider }; LanguageModel?: LanguageModelProvider }).ai?.languageModel
    || (globalThis as { LanguageModel?: LanguageModelProvider }).LanguageModel;

  if (lm) {
    try {
      const session = await lm.create({
        systemPrompt,
        initialPrompts: [{ role: 'system', content: systemPrompt }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      });
      const timeout = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini Nano timeout')), 12000)
      );
      const result = await Promise.race([session.prompt(userPrompt), timeout]);
      await session.destroy?.();
      return typeof result === 'string' ? result : null;
    } catch {
      // fall through to bridge
    }
  }

  if (typeof window === 'undefined') return null;
  if (window.location.protocol.startsWith('chrome-extension:')) return null;
  if (!mainWorldPort) return null;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    let resolved = false;
    const handler = (event: MessageEvent) => {
      if (resolved) return;
      if (event.data?.type !== 'SYNAPSECLEAN_AI_PROMPT_RESPONSE' || event.data.id !== requestId) return;
      resolved = true;
      mainWorldPort!.removeEventListener('message', handler);
      resolve(event.data.error ? null : (event.data.resultText ?? null));
    };
    mainWorldPort!.addEventListener('message', handler);
    mainWorldPort!.postMessage({
      type: 'SYNAPSECLEAN_AI_PROMPT_REQUEST',
      id: requestId,
      systemPrompt,
      prompt: userPrompt,
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        mainWorldPort!.removeEventListener('message', handler);
        resolve(null);
      }
    }, 15000);
  });
}

export async function compactWithGeminiNano(
  text: string,
  settings: SynapseSettings,
  meta: RefineMeta = {},
  options?: { chunkInstruction?: string }
): Promise<string | null> {
  const truncated = text.length > MAX_GEMINI_INPUT_CHARS
    ? `${text.slice(0, MAX_GEMINI_INPUT_CHARS)}\n\n[truncated]`
    : text;

  const { systemPrompt, userPrompt } = buildRefinePrompts(settings, truncated, meta, options);
  const result = await promptGeminiNano(systemPrompt, userPrompt);
  if (!result) return null;
  return result.trim().replace(/^```(?:markdown)?\n?/i, '').replace(/```$/i, '').trim();
}