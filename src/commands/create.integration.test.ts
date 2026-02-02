// src/commands/create.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Scaffolder } from '../scaffolder.js';

describe('Create Command Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-integration-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('creates complete marketplace and plugin structure', async () => {
    const scaffolder = new Scaffolder(testDir);

    // Create marketplace
    await scaffolder.createMarketplace('my-marketplace', 'John Doe');

    // Create plugin
    await scaffolder.createPlugin('my-plugin');
    await scaffolder.addPluginToMarketplace('my-plugin');

    // Verify marketplace.json
    const marketplacePath = join(testDir, '.claude-plugin', 'marketplace.json');
    const marketplaceContent = await fs.readFile(marketplacePath, 'utf-8');
    const marketplace = JSON.parse(marketplaceContent);

    expect(marketplace.name).toBe('my-marketplace');
    expect(marketplace.owner.name).toBe('John Doe');
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0].name).toBe('my-plugin');

    // Verify plugin.json
    const pluginPath = join(testDir, 'my-plugin', '.claude-plugin', 'plugin.json');
    const pluginContent = await fs.readFile(pluginPath, 'utf-8');
    const plugin = JSON.parse(pluginContent);

    expect(plugin.name).toBe('my-plugin');
    expect(plugin.version).toBe('1.0.0');

    // Verify sample skill
    const skillPath = join(testDir, 'my-plugin', '.claude-plugin', 'skills', 'summarize-project', 'SKILL.md');
    const skillContent = await fs.readFile(skillPath, 'utf-8');

    expect(skillContent).toContain('name: summarize-project');

    // Verify empty directories exist
    const commandsDir = await fs.stat(join(testDir, 'my-plugin', '.claude-plugin', 'commands'));
    const agentsDir = await fs.stat(join(testDir, 'my-plugin', '.claude-plugin', 'agents'));
    const scriptsDir = await fs.stat(join(testDir, 'my-plugin', '.claude-plugin', 'scripts'));

    expect(commandsDir.isDirectory()).toBe(true);
    expect(agentsDir.isDirectory()).toBe(true);
    expect(scriptsDir.isDirectory()).toBe(true);
  });
});
