const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN',
  'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE',
]);

const SKIP_ROOT_TAGS = new Set(['NAV', 'HEADER', 'FOOTER', 'ASIDE']);

function shouldSkipElement(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (SKIP_ROOT_TAGS.has(tag)) return true;

  const role = el.getAttribute('role')?.toLowerCase();
  if (role === 'navigation' || role === 'banner' || role === 'contentinfo') return true;

  const cls = `${el.className} ${el.id}`.toLowerCase();
  if (/\b(nav|navbar|sidebar|toc|table-of-contents|site-header|site-footer|menu)\b/.test(cls)) {
    return true;
  }

  return false;
}

function headingPrefix(tag: string): string {
  const level = Number(tag.charAt(1));
  return '#'.repeat(Math.min(6, Math.max(1, level))) + ' ';
}

function walk(node: Node, lines: string[], listDepth = 0, inPre = false): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ');
    if (text.trim()) lines.push(text);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  if (shouldSkipElement(el)) return;

  const tag = el.tagName;

  if (tag === 'BR') {
    lines.push('\n');
    return;
  }

  if (tag === 'HR') {
    lines.push('\n---\n');
    return;
  }

  if (tag === 'PRE' || tag === 'CODE' && el.parentElement?.tagName === 'PRE') {
    const code = el.textContent ?? '';
    if (tag === 'PRE') {
      lines.push('\n```\n' + code.trimEnd() + '\n```\n');
      return;
    }
  }

  if (/^H[1-6]$/.test(tag)) {
    lines.push('\n' + headingPrefix(tag) + (el.textContent ?? '').trim() + '\n');
    return;
  }

  if (tag === 'LI') {
    const indent = '  '.repeat(Math.max(0, listDepth - 1));
    const bullet = el.parentElement?.tagName === 'OL'
      ? `${Array.from(el.parentElement.children).indexOf(el) + 1}. `
      : '- ';
    const inner: string[] = [];
    for (const child of el.childNodes) walk(child, inner, listDepth, inPre);
    lines.push('\n' + indent + bullet + inner.join('').trim() + '\n');
    return;
  }

  if (tag === 'UL' || tag === 'OL') {
    for (const child of el.children) walk(child, lines, listDepth + 1, inPre);
    lines.push('\n');
    return;
  }

  if (tag === 'A') {
    const href = el.getAttribute('href') ?? '';
    const label = (el.textContent ?? '').trim();
    if (href && label && !href.startsWith('javascript:')) {
      lines.push(`[${label}](${href})`);
      return;
    }
  }

  if (tag === 'STRONG' || tag === 'B') {
    const inner: string[] = [];
    for (const child of el.childNodes) walk(child, inner, listDepth, inPre);
    lines.push(`**${inner.join('').trim()}**`);
    return;
  }

  if (tag === 'EM' || tag === 'I') {
    const inner: string[] = [];
    for (const child of el.childNodes) walk(child, inner, listDepth, inPre);
    lines.push(`*${inner.join('').trim()}*`);
    return;
  }

  if (tag === 'CODE' && el.parentElement?.tagName !== 'PRE') {
    lines.push('`' + (el.textContent ?? '').trim() + '`');
    return;
  }

  const block = BLOCK_TAGS.has(tag);
  if (block) lines.push('\n');

  for (const child of el.childNodes) walk(child, lines, listDepth, inPre || tag === 'PRE');

  if (block) lines.push('\n');
}

function normalizeMarkdown(raw: string): string {
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract the current selection as Markdown when HTML structure is available. */
export function getSelectionAsMarkdown(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return '';

  const range = sel.getRangeAt(0);
  const fragment = range.cloneContents();
  const lines: string[] = [];

  for (const child of fragment.childNodes) walk(child, lines);
  const md = normalizeMarkdown(lines.join(''));

  if (md.length >= 40) return md;
  return sel.toString();
}