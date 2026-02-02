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
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe('my-market');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.owner.name).toBe('John Doe');
    });

    it('includes optional fields when provided', async () => {
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        description: 'A test marketplace'
      });

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.owner.email).toBe('john@example.com');
      expect(parsed.description).toBe('A test marketplace');
    });
  });

  describe('createPlugin', () => {
    it('creates plugin directory structure', async () => {
      await scaffolder.createPlugin({ name: 'my-plugin' });

      const pluginDir = join(testDir, 'my-plugin', '.claude-plugin');
      const stat = await fs.stat(pluginDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates plugin.json with version', async () => {
      await scaffolder.createPlugin({ name: 'my-plugin' });

      const manifestPath = join(testDir, 'my-plugin', '.claude-plugin', 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe('my-plugin');
      expect(parsed.version).toBe('1.0.0');
    });

    it('includes description when provided', async () => {
      await scaffolder.createPlugin({
        name: 'my-plugin',
        description: 'A test plugin'
      });

      const manifestPath = join(testDir, 'my-plugin', '.claude-plugin', 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.description).toBe('A test plugin');
    });

    it('creates content directories at plugin root level', async () => {
      await scaffolder.createPlugin({ name: 'my-plugin' });

      const pluginRoot = join(testDir, 'my-plugin');

      const skillsDir = await fs.stat(join(pluginRoot, 'skills'));
      const commandsDir = await fs.stat(join(pluginRoot, 'commands'));
      const agentsDir = await fs.stat(join(pluginRoot, 'agents'));
      const scriptsDir = await fs.stat(join(pluginRoot, 'scripts'));

      expect(skillsDir.isDirectory()).toBe(true);
      expect(commandsDir.isDirectory()).toBe(true);
      expect(agentsDir.isDirectory()).toBe(true);
      expect(scriptsDir.isDirectory()).toBe(true);
    });

    it('creates sample hello-world skill', async () => {
      await scaffolder.createPlugin({ name: 'my-plugin' });

      const skillPath = join(testDir, 'my-plugin', 'skills', 'hello-world', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('name: hello-world');
      expect(content).toContain('description:');
    });
  });

  describe('addPluginToMarketplace', () => {
    it('adds plugin entry to marketplace.json', async () => {
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });

      await scaffolder.addPluginToMarketplace('my-plugin');

      const manifestPath = join(testDir, '.claude-plugin', 'marketplace.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.plugins).toHaveLength(1);
      expect(parsed.plugins[0].name).toBe('my-plugin');
      expect(parsed.plugins[0].source).toBe('./my-plugin');
    });

    it('appends to existing plugins array', async () => {
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });
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
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });

      const result = await scaffolder.hasMarketplace();
      expect(result).toBe(true);
    });
  });

  describe('pluginExists', () => {
    it('returns false when plugin does not exist', async () => {
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });

      const result = await scaffolder.pluginExists('my-plugin');
      expect(result).toBe(false);
    });

    it('returns true when plugin exists in marketplace', async () => {
      await scaffolder.createMarketplace({
        name: 'my-market',
        ownerName: 'John Doe'
      });
      await scaffolder.addPluginToMarketplace('my-plugin');

      const result = await scaffolder.pluginExists('my-plugin');
      expect(result).toBe(true);
    });
  });
});
