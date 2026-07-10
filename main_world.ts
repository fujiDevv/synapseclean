(() => {
  function getLanguageModel(): {
    availability?: (opts?: unknown) => Promise<string>;
    capabilities?: (opts?: unknown) => Promise<{ available: string }>;
    create: (opts: Record<string, unknown>) => Promise<{
      prompt: (text: string) => Promise<string>;
      destroy?: () => Promise<void>;
      close?: () => Promise<void>;
    }>;
  } | null {
    const scope = globalThis as { ai?: { languageModel?: unknown }; LanguageModel?: unknown };
    return (scope.ai?.languageModel || scope.LanguageModel || null) as ReturnType<typeof getLanguageModel>;
  }

  const expectedToken = document.currentScript?.dataset.synapseToken;

  window.addEventListener('message', (initEvent) => {
    if (initEvent.source !== window || !initEvent.data) return;
    if (initEvent.data.type !== 'SYNAPSECLEAN_AI_INIT_PORT' || !initEvent.ports[0]) return;
    if (expectedToken && initEvent.data.token !== expectedToken) return;

    const port = initEvent.ports[0];
    port.onmessage = async (event) => {
      if (!event.data) return;

      if (event.data.type === 'SYNAPSECLEAN_AI_AVAILABILITY_REQUEST') {
        const lm = getLanguageModel();
        let availability = 'unavailable';
        if (lm) {
          try {
            if (typeof lm.availability === 'function') {
              availability = await lm.availability({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
            } else if (typeof lm.capabilities === 'function') {
              const caps = await lm.capabilities({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
              availability = caps.available;
            }
          } catch (err) {
            console.warn('[SynapseClean] Gemini availability failed:', err);
          }
        }
        port.postMessage({ type: 'SYNAPSECLEAN_AI_AVAILABILITY_RESPONSE', id: event.data.id, availability });
      }

      if (event.data.type === 'SYNAPSECLEAN_AI_PROMPT_REQUEST') {
        const { id, systemPrompt, prompt } = event.data;
        const lm = getLanguageModel();
        if (!lm) {
          port.postMessage({ type: 'SYNAPSECLEAN_AI_PROMPT_RESPONSE', id, error: 'Prompt API unavailable' });
          return;
        }

        let session: Awaited<ReturnType<NonNullable<ReturnType<typeof getLanguageModel>>['create']>> | null = null;
        try {
          session = await lm.create({
            systemPrompt,
            initialPrompts: [{ role: 'system', content: systemPrompt }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
          });
          const resultText = await session.prompt(prompt);
          port.postMessage({ type: 'SYNAPSECLEAN_AI_PROMPT_RESPONSE', id, resultText });
        } catch (error: unknown) {
          port.postMessage({
            type: 'SYNAPSECLEAN_AI_PROMPT_RESPONSE',
            id,
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          if (session) {
            try {
              await session.destroy?.();
              await session.close?.();
            } catch {
              // ignore
            }
          }
        }
      }
    };
    port.start();
  });
})();