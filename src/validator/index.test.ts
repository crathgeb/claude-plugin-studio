// src/validator/index.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Validator } from './index.js';

describe('Validator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-validator-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('validates a complete plugin', async () => {
    // Set up valid plugin
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'test-plugin', version: '1.0.0' })
    );

    const validator = new Validator();
    const result = await validator.validatePlugin(testDir);

    expect(result.valid).toBe(true);
  });

  it('fails on schema errors', async () => {
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ version: '1.0.0' }) // missing name
    );

    const validator = new Validator();
    const result = await validator.validatePlugin(testDir);

    expect(result.valid).toBe(false);
    expect(result.errors[0].layer).toBe('schema');
  });

  it('validates a complete marketplace', async () => {
    // Set up valid marketplace with a plugin
    const marketDir = join(testDir, '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'test-market',
        owner: { name: 'Test' },
        plugins: [{ name: 'my-plugin', source: './plugins/my-plugin' }]
      })
    );

    // Create the plugin
    const pluginDir = join(testDir, 'plugins', 'my-plugin', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'my-plugin' })
    );

    const validator = new Validator();
    const result = await validator.validateMarketplace(testDir);

    expect(result.valid).toBe(true);
  });
});
