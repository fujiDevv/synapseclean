import { describe, expect, it } from 'vitest';
import { migrateSettings } from '../src/settings-migrate';

describe('migrateSettings', () => {
  it('fills new refine fields for legacy settings', () => {
    const migrated = migrateSettings({
      enabled: true,
      autoCompactOnCopy: true,
      minCharsToCompact: 200,
      outputFormat: 'outline',
      showToast: true,
      useGeminiNano: false,
    });

    expect(migrated.refinePreset).toBe('outline-only');
    expect(migrated.refineMode).toBe('preset');
    expect(migrated.refineLength).toBe('balanced');
    expect(migrated.compactionMode).toBe('prepare');
    expect(migrated.customUserPromptTemplate).toContain('{{text}}');
  });
});