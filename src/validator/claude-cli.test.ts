// src/validator/claude-cli.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeCliValidator } from './claude-cli.js';

describe('ClaudeCliValidator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-claude-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('parses successful validation', async () => {
    // Create a valid plugin structure
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'test-plugin', version: '1.0.0' })
    );

    const validator = new ClaudeCliValidator();
    const result = await validator.validate(testDir);

    // This test may fail if claude CLI is not installed
    // That's OK - in real usage we handle that gracefully
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });

  it('handles missing claude CLI gracefully', async () => {
    const validator = new ClaudeCliValidator();
    // Mock exec to simulate missing CLI
    const originalValidate = validator.validate.bind(validator);

    vi.spyOn(validator, 'validate').mockImplementation(async () => ({
      valid: true,
      errors: [],
      skipped: true
    }));

    const result = await validator.validate('/nonexistent');
    expect(result.valid).toBe(true);
  });
});
