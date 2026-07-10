# Privacy Policy — SynapseClean

**Effective date:** July 1, 2026  
**Product:** SynapseClean Chrome Extension  
**Version:** 1.0.0

---

## 1. Summary

SynapseClean is an open-source browser extension that compacts webpage text into clean AI prompts **before** it reaches your clipboard.

**Core principle: selected and compacted text never leaves your browser for processing.**

SynapseClean does not operate a backend service, does not collect telemetry, does not require an account, and does not sell or share user data.

---

## 2. Scope

This policy applies to:

- The SynapseClean Chrome extension
- Its on-device compaction pipeline
- Local storage used for settings and usage statistics

This policy does **not** govern third-party websites where the extension runs. Those sites maintain their own privacy terms.

---

## 3. Data Processed Locally

When you copy or compact a selection, SynapseClean processes text entirely on your device:

| Data | Purpose | Leaves device? |
|------|---------|----------------|
| Selected webpage text | Rule-based and optional semantic compaction | **No** |
| Page title (Gemini path) | Context for semantic compaction prompt | **No** |
| Compaction settings | User preferences | **No** |
| Usage statistics | Local metrics (counts, characters saved) | **No** |

SynapseClean does **not** upload page content to developer servers or third-party AI APIs. Optional Gemini Nano processing uses Chrome's on-device Prompt API only.

---

## 4. On-Device Processing

| Stage | Technology | Location |
|-------|------------|----------|
| Selection capture | Content script copy intercept | Active tab |
| Rule compaction | Local strip and format engine | Content script |
| Semantic refinement | Chrome Gemini Nano Prompt API (optional) | Main-world bridge |

### What is not sent to cloud services

- Selected or compacted text
- Browsing history
- Full page DOM snapshots
- Clipboard contents beyond local write-back after compaction

If Gemini Nano is unavailable, SynapseClean falls back to rule-based compaction. It does not route text to external LLM endpoints.

---

## 5. Data Stored Locally

SynapseClean stores the following in `chrome.storage.local`:

| Key | Contents | Retention |
|-----|----------|-----------|
| `synapseclean-settings` | Enabled state, thresholds, output format, Gemini toggle | Until changed or extension removed |
| `synapseclean-stats` | Total compactions, characters saved, Gemini usage count | Until changed or extension removed |

This data remains on your device and is removed when you uninstall the extension.

---

## 6. Network Activity

SynapseClean makes **no network requests** for:

- Compaction or clipboard processing
- License validation or payments
- Analytics, crash reporting, or telemetry
- Remote configuration or updates

The extension does not phone home.

---

## 7. Permissions

| Permission | Why it is required |
|------------|-------------------|
| `storage` | Persist settings and local usage statistics |
| `contextMenus` | "Compact for AI" right-click action on selections |
| `activeTab` / `scripting` | Run compaction bridge on the active tab |
| `clipboardWrite` | Write compacted text to the clipboard |
| `tabs` | Open Prompt Console on first install |
| `<all_urls>` | Intercept copy events on pages where you select research text |

Broad host access is required because users gather content from arbitrary websites. SynapseClean only acts on explicit user copy or compact actions, not passive page scraping.

---

## 8. Third Parties

| Party | Role |
|-------|------|
| Google Chrome | Host browser; optional Gemini Nano via built-in Prompt API (on-device) |

SynapseClean does not integrate Google Analytics, Sentry, payment processors, or similar tracking or billing SDKs.

---

## 9. Children's Privacy

SynapseClean is not directed at children under 13 and does not knowingly collect personal information from children.

---

## 10. Changes to This Policy

We may update this policy when extension behavior or permissions change. The effective date at the top of this document will be revised accordingly. Continued use after updates constitutes acceptance of the revised policy.

---

## 11. Contact

Privacy questions: **fujidevv@duck.com**

Security reports: **fujidevv@duck.com** (subject: `Security Report — synapseclean`)

Repository: https://github.com/fujiDevv/synapseclean

> Monorepo copy also lives at [../PRIVACY.md](../PRIVACY.md).
