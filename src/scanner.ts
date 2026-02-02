// src/scanner.ts
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import type { DiscoveredItem } from './types.js';

export class Scanner {
  constructor(private rootDir: string) {}

  async scan(): Promise<DiscoveredItem[]> {
    const items: DiscoveredItem[] = [];
    await this.scanDirectory(this.rootDir, items);
    return items;
  }

  private async scanDirectory(
    dir: string,
    items: DiscoveredItem[]
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.name === '.claude-plugin') {
          await this.checkClaudePluginDir(fullPath, items);
        } else {
          await this.scanDirectory(fullPath, items);
        }
      }
    }
  }

  private async checkClaudePluginDir(
    claudePluginDir: string,
    items: DiscoveredItem[]
  ): Promise<void> {
    const parentDir = dirname(claudePluginDir);

    // Check for marketplace.json first (takes priority)
    const marketplacePath = join(claudePluginDir, 'marketplace.json');
    try {
      const content = await fs.readFile(marketplacePath, 'utf-8');
      const manifest = JSON.parse(content);
      items.push({
        type: 'marketplace',
        name: manifest.name || 'unknown',
        path: parentDir,
        manifestPath: marketplacePath
      });
      return;
    } catch {
      // Not a marketplace, check for plugin
    }

    // Check for plugin.json
    const pluginPath = join(claudePluginDir, 'plugin.json');
    try {
      const content = await fs.readFile(pluginPath, 'utf-8');
      const manifest = JSON.parse(content);
      items.push({
        type: 'plugin',
        name: manifest.name || 'unknown',
        path: parentDir,
        manifestPath: pluginPath
      });
    } catch {
      // Neither marketplace nor plugin
    }
  }
}
