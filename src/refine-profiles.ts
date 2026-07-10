import type { RefineLength, RefinePreset, SynapseSettings } from './types';

export interface RefineProfile {
  id: RefinePreset;
  label: string;
  description: string;
  schemaPreview: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

const LENGTH_INSTRUCTIONS: Record<RefineLength, string> = {
  concise: 'Shorten prose where possible but keep every distinct fact, name, number, and quote.',
  balanced: 'Balance clarity and completeness. Keep all sections and substantive details.',
  comprehensive: 'Preserve comprehensive coverage. Do not omit sections or substantive details from the source.',
};

const BASE_SYSTEM_RULES = `You are SynapseClean, a local semantic prompt refiner for AI power-users.

Your job: transform messy webpage copy into a structured, clean, AI-ready prompt.

STRICT RULES:
- Remove cookie banners, nav menus, footers, ads, social widgets, legal boilerplate, and formatting artifacts.
- Preserve factual content, names, numbers, quotes, code snippets, and key arguments.
- Output ONLY the refined content — no preamble, no "here is your summary".
- Structure and clean the text; do NOT over-summarize or aggressively compress.
- Follow the output schema exactly.
- Never invent facts not present in the source text.`;

function defaultUserTemplate(): string {
  return `{{formatHint}}

Source page: {{sourceTitle}}
Source URL: {{sourceUrl}}

LENGTH POLICY: {{lengthPolicy}}

OUTPUT SCHEMA:
{{schema}}

TEXT TO REFINE:
"""
{{text}}
"""`;
}

export const REFINE_PROFILES: Record<RefinePreset, RefineProfile> = {
  'ai-prompt': {
    id: 'ai-prompt',
    label: 'AI Prompt',
    description: 'Task-oriented prompt with context, source material, and constraints.',
    schemaPreview: '# Task\n## Context\n## Source material\n## Constraints\n## Desired output',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
# Task
## Context
## Source material
## Constraints
## Desired output`,
    userPromptTemplate: defaultUserTemplate(),
  },
  'research-brief': {
    id: 'research-brief',
    label: 'Research Brief',
    description: 'Summary with key claims, evidence, and open questions.',
    schemaPreview: '# Summary\n## Key claims\n## Evidence\n## Open questions',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
# Summary
## Key claims
## Evidence
## Open questions`,
    userPromptTemplate: defaultUserTemplate(),
  },
  'product-spec': {
    id: 'product-spec',
    label: 'Product Spec',
    description: 'Product landing pages: value prop, features, pricing, CTAs.',
    schemaPreview: '# Product\n## Value proposition\n## Features\n## Pricing\n## Calls to action',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
# Product
## Value proposition
## Features
## Pricing
## Calls to action`,
    userPromptTemplate: defaultUserTemplate(),
  },
  'meeting-notes': {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    description: 'Decisions, action items, and references from discussion content.',
    schemaPreview: '# Topic\n## Decisions\n## Action items\n## References',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
# Topic
## Decisions
## Action items
## References`,
    userPromptTemplate: defaultUserTemplate(),
  },
  'outline-only': {
    id: 'outline-only',
    label: 'Outline Only',
    description: 'Hierarchical Markdown outline without prose compression.',
    schemaPreview: '## Section\n### Subsection\n- Key point',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
Use hierarchical Markdown headings (##, ###) and bullet points. No long prose paragraphs.`,
    userPromptTemplate: defaultUserTemplate(),
  },
  'bullets-only': {
    id: 'bullets-only',
    label: 'Bullets Only',
    description: 'Grouped bullet lists under section headings.',
    schemaPreview: '## Section\n- Point\n- Point',
    systemPrompt: `${BASE_SYSTEM_RULES}

OUTPUT SCHEMA:
Use section headings (##) with grouped bullet lists (-). No prose paragraphs.`,
    userPromptTemplate: defaultUserTemplate(),
  },
};

export function getRefineProfile(preset: RefinePreset): RefineProfile {
  return REFINE_PROFILES[preset];
}

export function getRefineProfileLabel(preset: RefinePreset): string {
  return REFINE_PROFILES[preset].label;
}

function formatHintForOutput(outputFormat: SynapseSettings['outputFormat']): string {
  if (outputFormat === 'bullets') return 'Prefer bullet points under section headings.';
  if (outputFormat === 'outline') return 'Prefer a hierarchical Markdown outline.';
  return 'Use clean Markdown with headings and short paragraphs.';
}

export function buildRefinePrompts(
  settings: SynapseSettings,
  text: string,
  meta: { sourceTitle?: string; sourceUrl?: string },
  options?: { chunkInstruction?: string }
): { systemPrompt: string; userPrompt: string } {
  const profile = getRefineProfile(settings.refinePreset);
  const systemPrompt = settings.refineMode === 'custom' && settings.customSystemPrompt.trim()
    ? settings.customSystemPrompt.trim()
    : profile.systemPrompt;

  const template = settings.refineMode === 'custom' && settings.customUserPromptTemplate.trim()
    ? settings.customUserPromptTemplate.trim()
    : profile.userPromptTemplate;

  const schema = profile.schemaPreview;
  const lengthPolicy = LENGTH_INSTRUCTIONS[settings.refineLength];
  const formatHint = formatHintForOutput(settings.outputFormat);
  const chunkNote = options?.chunkInstruction ? `\n${options.chunkInstruction}` : '';

  const userPrompt = template
    .replace(/\{\{formatHint\}\}/g, formatHint)
    .replace(/\{\{sourceTitle\}\}/g, meta.sourceTitle || 'unknown')
    .replace(/\{\{sourceUrl\}\}/g, meta.sourceUrl || 'unknown')
    .replace(/\{\{lengthPolicy\}\}/g, lengthPolicy)
    .replace(/\{\{schema\}\}/g, schema)
    .replace(/\{\{text\}\}/g, text)
    + chunkNote;

  return { systemPrompt, userPrompt };
}

export function validateUserPromptTemplate(template: string): string | null {
  if (!template.trim()) return 'User prompt template cannot be empty.';
  if (!template.includes('{{text}}')) return 'User prompt template must include {{text}}.';
  if (template.length > 8_000) return 'User prompt template must be 8,000 characters or fewer.';
  return null;
}

export function presetFromOutputFormat(format: SynapseSettings['outputFormat']): RefinePreset {
  if (format === 'outline') return 'outline-only';
  if (format === 'bullets') return 'bullets-only';
  return 'ai-prompt';
}