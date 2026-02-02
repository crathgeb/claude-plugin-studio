// src/scaffolder.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Scaffolder } from './scaffolder.js';

describe('Scaffolder', () => {
  let testDir: string;
  let scaffolder: Scaffolder;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-scaffolder-'));
    scaffolder = new Scaffolder(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createMarketplace', () => {
    it('creates .claude-plugin/marketplace.json', async () => {
      await scaffolder.createMarketplace('my-market', 'John Doe');

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe('my-market');
      expect(parsed.owner.name).toBe('John Doe');
    });
  });

  describe('createPlugin', () => {
    it('creates plugin directory structure', async () => {
      await scaffolder.createPlugin('my-plugin');

      const pluginDir = join(testDir, 'my-plugin', '.claude-plugin');
      const stat = await fs.stat(pluginDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates plugin.json', async () => {
      await scaffolder.createPlugin('my-plugin');

      const manifestPath = join(testDir, 'my-plugin', '.claude-plugin', 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe('my-plugin');
      expect(parsed.version).toBe('1.0.0');
    });

    it('creates skills directory with sample skill', async () => {
      await scaffolder.createPlugin('my-plugin');

      const skillPath = join(testDir, 'my-plugin', '.claude-plugin', 'skills', 'summarize-project', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('name: summarize-project');
    });

    it('creates empty directories for commands, agents, scripts', async () => {
      await scaffolder.createPlugin('my-plugin');

      const baseDir = join(testDir, 'my-plugin', '.claude-plugin');

      const commandsDir = await fs.stat(join(baseDir, 'commands'));
      const agentsDir = await fs.stat(join(baseDir, 'agents'));
      const scriptsDir = await fs.stat(join(baseDir, 'scripts'));

      expect(commandsDir.isDirectory()).toBe(true);
      expect(agentsDir.isDirectory()).toBe(true);
      expect(scriptsDir.isDirectory()).toBe(true);
    });
  });

  describe('addPluginToMarketplace', () => {
    it('adds plugin entry to marketplace.json', async () => {
      // Create marketplace first
      await scaffolder.createMarketplace('my-market', 'John Doe');

      // Add plugin
      await scaffolder.addPluginToMarketplace('my-plugin');

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.plugins).toHaveLength(1);
      expect(parsed.plugins[0].name).toBe('my-plugin');
      expect(parsed.plugins[0].source).toBe('./my-plugin');
    });

    it('appends to existing plugins array', async () => {
      await scaffolder.createMarketplace('my-market', 'John Doe');
      await scaffolder.addPluginToMarketplace('plugin-a');
      await scaffolder.addPluginToMarketplace('plugin-b');

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.plugins).toHaveLength(2);
    });
  });

  describe('hasMarketplace', () => {
    it('returns false when no marketplace exists', async () => {
      const result = await scaffolder.hasMarketplace();
      expect(result).toBe(false);
    });

    it('returns true when marketplace exists', async () => {
      await scaffolder.createMarketplace('my-market', 'John Doe');

      const result = await scaffolder.hasMarketplace();
      expect(result).toBe(true);
    });
  });

  describe('pluginExists', () => {
    it('returns false when plugin does not exist', async () => {
      await scaffolder.createMarketplace('my-market', 'John Doe');

      const result = await scaffolder.pluginExists('my-plugin');
      expect(result).toBe(false);
    });

    it('returns true when plugin exists in marketplace', async () => {
      await scaffolder.createMarketplace('my-market', 'John Doe');
      await scaffolder.addPluginToMarketplace('my-plugin');

      const result = await scaffolder.pluginExists('my-plugin');
      expect(result).toBe(true);
    });
  });
});
