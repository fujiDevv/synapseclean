import { test, expect } from './fixtures';
import {
  copySelection,
  injectFixture,
  MESSY_ARTICLE_HTML,
  readClipboard,
  seedExtensionSettings,
  selectArticleText,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test.describe('SynapseClean copy compaction', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('compacts selection on copy and shows toast', async ({ page, context, extensionId }) => {
    await seedExtensionSettings(context, extensionId);
    await injectFixture(page, MESSY_ARTICLE_HTML);
    await selectArticleText(page);
    await copySelection(page);

    const toast = page.locator('#synapseclean-toast-host');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('synapseclean');
    await expect(toast).toContainText('Copied cleaned prompt to clipboard');

    const clipboard = await readClipboard(page);
    expect(clipboard.length).toBeGreaterThan(0);
    expect(clipboard.length).toBeLessThan(MESSY_ARTICLE_HTML.length);
    expect(clipboard.toLowerCase()).not.toContain('accept all cookies');
    expect(clipboard.toLowerCase()).not.toContain('subscribe to our newsletter');
    expect(clipboard).toContain('consensus protocols');
    expect(clipboard).toContain('## Source Content');
    expect(clipboard).toContain('## Instructions for the AI');
  });

  test('prepare mode keeps substantive content for long selections', async ({ page, context, extensionId }) => {
    await seedExtensionSettings(context, extensionId);
    const longBody = '<p>Key insight about structured prompts for AI workflows.</p>'.repeat(80);
    const longHtml = `<article id="article"><h1>Long Landing Page</h1>${longBody}</article>`;
    await injectFixture(page, longHtml);
    await selectArticleText(page);
    await copySelection(page);

    const clipboard = await readClipboard(page);
    expect(clipboard).toContain('Long Landing Page');
    expect(clipboard).toContain('Key insight about structured prompts');
    expect(clipboard).not.toContain('[…]');
  });
});