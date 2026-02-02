// src/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Scanner } from './scanner.js';

describe('Scanner', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('finds a plugin manifest', async () => {
    const pluginDir = join(testDir, 'my-plugin', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'my-plugin' })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('plugin');
    expect(items[0].name).toBe('my-plugin');
  });

  it('finds a marketplace manifest', async () => {
    const marketDir = join(testDir, 'my-marketplace', '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'my-marketplace',
        owner: { name: 'Test' },
        plugins: []
      })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('marketplace');
    expect(items[0].name).toBe('my-marketplace');
  });

  it('finds multiple items', async () => {
    // Plugin
    const pluginDir = join(testDir, 'plugin-a', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'plugin-a' })
    );

    // Marketplace
    const marketDir = join(testDir, 'market-b', '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'market-b',
        owner: { name: 'Test' },
        plugins: []
      })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(2);
  });

  it('returns empty array when nothing found', async () => {
    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(0);
  });
});
