// src/sync/settings.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
}

export class SettingsReader {
  private settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath =
      settingsPath || join(homedir(), '.claude', 'settings.json');
  }

  async getInstalledPlugins(marketplaceName: string): Promise<string[]> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const settings: ClaudeSettings = JSON.parse(content);

      if (!settings.enabledPlugins) {
        return [];
      }

      const plugins: string[] = [];
      const suffix = `@${marketplaceName}`;

      for (const key of Object.keys(settings.enabledPlugins)) {
        if (key.endsWith(suffix) && settings.enabledPlugins[key]) {
          const pluginName = key.slice(0, -suffix.length);
          plugins.push(pluginName);
        }
      }

      return plugins;
    } catch {
      return [];
    }
  }
}
