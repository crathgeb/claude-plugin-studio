// src/scaffolder.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Templates } from './templates/index.js';
import type { MarketplaceManifest } from './types.js';
import type { MarketplaceOptions, PluginOptions } from './templates/index.js';

export class Scaffolder {
  private claudePluginDir: string;

  constructor(private rootDir: string) {
    this.claudePluginDir = join(rootDir, '.claude-plugin');
  }

  async createMarketplace(options: MarketplaceOptions): Promise<void> {
    await fs.mkdir(this.claudePluginDir, { recursive: true });

    const manifestPath = join(this.claudePluginDir, 'marketplace.json');
    const content = Templates.marketplaceJson(options);
    await fs.writeFile(manifestPath, content, 'utf-8');
  }

  async createPlugin(options: PluginOptions): Promise<void> {
    const pluginRoot = join(this.rootDir, options.name);
    const claudePluginDir = join(pluginRoot, '.claude-plugin');

    // Create .claude-plugin directory
    await fs.mkdir(claudePluginDir, { recursive: true });

    // Create content directories at plugin root level
    await fs.mkdir(join(pluginRoot, 'skills', 'hello-world'), { recursive: true });
    await fs.mkdir(join(pluginRoot, 'commands'), { recursive: true });
    await fs.mkdir(join(pluginRoot, 'agents'), { recursive: true });
    await fs.mkdir(join(pluginRoot, 'scripts'), { recursive: true });

    // Write plugin.json
    const manifestPath = join(claudePluginDir, 'plugin.json');
    await fs.writeFile(manifestPath, Templates.pluginJson(options), 'utf-8');

    // Write sample skill
    const skillPath = join(pluginRoot, 'skills', 'hello-world', 'SKILL.md');
    await fs.writeFile(skillPath, Templates.helloWorldSkill(), 'utf-8');
  }

  async addPluginToMarketplace(pluginName: string): Promise<void> {
    const manifestPath = join(this.claudePluginDir, 'marketplace.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest: MarketplaceManifest = JSON.parse(content);

    manifest.plugins.push(Templates.pluginEntry(pluginName));

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  async hasMarketplace(): Promise<boolean> {
    const manifestPath = join(this.claudePluginDir, 'marketplace.json');
    try {
      await fs.access(manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  async pluginExists(pluginName: string): Promise<boolean> {
    const manifestPath = join(this.claudePluginDir, 'marketplace.json');
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest: MarketplaceManifest = JSON.parse(content);
      return manifest.plugins.some((p) => p.name === pluginName);
    } catch {
      return false;
    }
  }
}
