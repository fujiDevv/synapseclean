# Changelog

## 1.1.0 — July 2026

- Prepare → refine pipeline: rules lightly clean without aggressive 12% summarization
- AI-ready Markdown boilerplate template when Gemini Nano is off or unavailable
- Refinement profiles (AI Prompt, Research Brief, Product Spec, Meeting Notes, Outline, Bullets)
- Full system/user prompt editor in Prompt Console with preset restore
- Chunked Gemini refinement for long landing pages (>12K prepared text)
- Refinement length control: Concise, Balanced, Comprehensive
- Relaxed Gemini upgrade validation to accept structured output

## 1.0.1 — July 2026

- Two-phase compaction: rules write to clipboard instantly; Gemini Nano refines in background when available
- Gemini receives rule-compacted text (up to 12K chars) for better semantic shrink on large selections
- Gemini upgrade auto-updates clipboard when refinement completes (no manual copy button)
- Background IPC sender validation for settings, stats, and compaction recording
- Comment-section stripping for Dev.to and similar layouts
- Gemini runs only when Prompt API status is `available`

## 1.0.0 — July 2026

- Initial release — local context compactor for AI power-users
- Rule-based compaction with auto-copy intercept
- Unlimited Gemini Nano semantic cleaning (open source)
- Alt+Shift+C keyboard shortcut and context menu
- Settings console with local usage stats
- MIT licensed — no payments or license keys