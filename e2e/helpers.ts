import type { BrowserContext, Page } from '@playwright/test';

export const E2E_ORIGIN = 'https://example.com';

const E2E_SETTINGS = {
  enabled: true,
  autoCompactOnCopy: true,
  minCharsToCompact: 200,
  outputFormat: 'markdown',
  showToast: true,
  useGeminiNano: false,
  refineMode: 'preset',
  refinePreset: 'ai-prompt',
  refineLength: 'balanced',
  customSystemPrompt: '',
  customUserPromptTemplate: '',
  compactionMode: 'prepare',
} as const;

const SUBSTANTIVE =
  'Distributed systems rely on consensus protocols, replication, and fault tolerance to stay available when nodes fail or networks partition unexpectedly.';

export const MESSY_ARTICLE_HTML = `
<article id="article">
  <nav>Home | Privacy | FAQ</nav>
  <p>Accept all cookies</p>
  <h1>Architecture Overview</h1>
  <p>${SUBSTANTIVE}</p>
  <p>Subscribe to our newsletter</p>
  <p>${SUBSTANTIVE}</p>
  <footer>Share on Twitter — All rights reserved</footer>
</article>`;

export async function seedExtensionSettings(
  context: BrowserContext,
  extensionId: string
): Promise<void> {
  const setupPage = await context.newPage();
  await setupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`, {
    waitUntil: 'domcontentloaded',
  });
  await setupPage.evaluate((settings) => {
    return chrome.storage.local.set({ 'synapseclean-settings': settings });
  }, E2E_SETTINGS);
  await setupPage.close();
}

export async function injectFixture(page: Page, html: string): Promise<void> {
  await page.unrouteAll().catch(() => {});

  await page.route(`${E2E_ORIGIN}/**`, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><head><title>SynapseClean E2E</title></head><body>${html}</body></html>`,
      });
      return;
    }
    await route.abort();
  });

  await page.goto(`${E2E_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
  // Content script loads settings from the background worker before copy hooks attach.
  await page.waitForTimeout(1200);
}

export async function selectArticleText(page: Page): Promise<void> {
  await page.evaluate(() => {
    const article = document.getElementById('article');
    if (!article) throw new Error('article fixture missing');

    const range = document.createRange();
    range.selectNodeContents(article);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

export async function copySelection(page: Page): Promise<void> {
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+c' : 'Control+c');
}

export async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(async () => navigator.clipboard.readText());
}