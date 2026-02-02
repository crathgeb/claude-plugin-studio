// src/scaffolder.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Templates } from './templates/index.js';
import type { MarketplaceManifest } from './types.js';

export class Scaffolder {
  private claudePluginDir: string;

  constructor(private rootDir: string) {
    this.claudePluginDir = join(rootDir, '.claude-plugin');
  }

  async createMarketplace(name: string, ownerName: string): Promise<void> {
    await fs.mkdir(this.claudePluginDir, { recursive: true });

    const manifestPath = join(this.claudePluginDir, 'marketplace.json');
    const content = Templates.marketplaceJson(name, ownerName);
    await fs.writeFile(manifestPath, content, 'utf-8');
  }

  async createPlugin(name: string): Promise<void> {
    const pluginDir = join(this.rootDir, name, '.claude-plugin');

    // Create directories
    await fs.mkdir(join(pluginDir, 'skills', 'summarize-project'), { recursive: true });
    await fs.mkdir(join(pluginDir, 'commands'), { recursive: true });
    await fs.mkdir(join(pluginDir, 'agents'), { recursive: true });
    await fs.mkdir(join(pluginDir, 'scripts'), { recursive: true });

    // Write plugin.json
    const manifestPath = join(pluginDir, 'plugin.json');
    await fs.writeFile(manifestPath, Templates.pluginJson(name), 'utf-8');

    // Write sample skill
    const skillPath = join(pluginDir, 'skills', 'summarize-project', 'SKILL.md');
    await fs.writeFile(skillPath, Templates.sampleSkill(), 'utf-8');
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
