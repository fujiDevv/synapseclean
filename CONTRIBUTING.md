# Contributing to SynapseClean

Thank you for helping improve SynapseClean. This document covers local setup, development workflow, and pull request expectations.

---

## Code of Conduct

- Keep changes focused and reviewable
- Prioritize on-device privacy: do not introduce remote telemetry, analytics, or cloud payload transmission
- Preserve the open-source model: no paid tiers, license keys, or payment integrations
- Document behavior changes that affect compaction output, permissions, or stored settings

---

## Prerequisites

| Tool | Version |
|------|---------|
| [Bun](https://bun.sh/) | 1.1+ |
| Google Chrome or Chromium | 127+ (120+ minimum) |

Optional:

- Chrome **Prompt API for Gemini Nano** enabled at `chrome://flags/#prompt-api-for-gemini-nano` for semantic compaction testing
- Python 3 with [Pillow](https://pypi.org/project/pillow/) for `bun run logos`

---

## Local Setup

```bash
git clone https://github.com/fujiDevv/synapseclean.git
cd synapseclean
bun install
bun run build
```

Load `dist/` as an unpacked extension in `chrome://extensions` with Developer mode enabled.

---

## Development Workflow

### Watch mode

Rebuild automatically on file changes:

```bash
bun run dev
```

Reload the extension in `chrome://extensions` after each rebuild.

### Type checking, unit tests, and build

```bash
bun run verify
```

`verify` runs `type-check`, unit tests, and a production `build`.

### Playwright e2e tests

```bash
bun run build
bun run test:e2e
```

### Production build

```bash
bun run build
```

Output is written to `dist/`. Do not commit `dist/` unless the project explicitly requires release artifacts in version control.

---

## Making Changes

### Scope your work

| Area | Path | Notes |
|------|------|-------|
| Compaction logic | `src/compactor.ts`, `src/html-to-markdown.ts`, `src/templates.ts` | Prepare-mode rule engine and boilerplate template |
| Refinement profiles | `src/refine-profiles.ts`, `src/gemini-chunking.ts` | Preset/custom Gemini prompts and chunked refinement |
| Gemini integration | `src/ai.ts`, `main_world.ts` | On-device structured refinement |
| Content script | `content.ts` | Copy intercept, clipboard writes |
| Background | `background.ts` | Settings, stats, message handlers |
| UI | `popup/`, `options/` | Dashboard and Prompt Console |
| Manifest | `src/manifest.json` | Permissions and extension metadata |

### Coding standards

- TypeScript strict mode; run `bun run verify` before opening a PR (type-check + unit tests)
- Match existing naming, import style, and file layout
- Avoid drive-by refactors unrelated to your change
- Do not add verbose comments for obvious code paths
- Keep network surface at zero unless there is a documented, user-initiated exception

### Testing manually

1. Build or run watch mode
2. Reload the unpacked extension
3. Open any article-length webpage
4. Select 200+ characters and copy, or use `Alt+Shift+C`
5. Verify clipboard output, toast behavior, and popup metrics
6. If touching Gemini: test with Prompt API enabled and disabled

---

## Pull Request Guidelines

### Before you open a PR

- [ ] `bun run verify` passes
- [ ] Manual testing completed for affected flows
- [ ] No new external network calls without explicit discussion in the issue
- [ ] README, PRIVACY.md, or CONTRIBUTING.md updated if behavior or permissions changed

### PR description

Include:

1. **Summary** — what changed and why
2. **Test plan** — steps you ran to verify the change
3. **Screenshots** — for UI changes (popup, options, toast)
4. **Breaking changes** — if settings keys, defaults, or output format changed

### Commit messages

Use clear, imperative subjects:

```
fix: prevent double compaction on rapid copy events
feat: add outline format option to popup toggle
docs: clarify Gemini Nano flag requirements
```

### Before a Chrome Web Store release

- [ ] `bun run verify` passes
- [ ] `bun run test:e2e` passes (after `bun run build`)
- [ ] Extension version in `package.json` and `src/manifest.json` matches the web changelog
- [ ] Manual smoke test on a real article page (copy intercept, shortcut, Gemini two-phase flow if enabled)

---

## Reporting Issues

Open a [GitHub issue](https://github.com/fujiDevv/synapseclean/issues) with:

- Chrome version
- Extension version (`manifest.json` or popup footer)
- Steps to reproduce
- Expected vs actual compaction output (redact sensitive content)
- Whether Gemini Nano was enabled

For security vulnerabilities, email **fujidevv@duck.com** with subject `Security Report — synapseclean`. Do not file public issues for undisclosed security bugs.

---

## Feature Proposals

For larger changes (new compaction engines, permission changes, storage schema migrations), open an issue first to discuss scope. SynapseClean is intentionally local-first and open-source; proposals that require cloud APIs or monetization are out of scope.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).