// src/sync/settings.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SettingsReader } from './settings.js';

describe('SettingsReader', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-settings-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('reads installed plugins from settings', async () => {
    const settingsPath = join(testDir, 'settings.json');
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        enabledPlugins: {
          'plugin-a@my-market': true,
          'plugin-b@my-market': true,
          'plugin-c@other-market': true
        }
      })
    );

    const reader = new SettingsReader(settingsPath);
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toContain('plugin-a');
    expect(plugins).toContain('plugin-b');
    expect(plugins).not.toContain('plugin-c');
  });

  it('returns empty array when no plugins installed', async () => {
    const settingsPath = join(testDir, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify({}));

    const reader = new SettingsReader(settingsPath);
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toHaveLength(0);
  });

  it('handles missing settings file', async () => {
    const reader = new SettingsReader(join(testDir, 'nonexistent.json'));
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toHaveLength(0);
  });
});
