// src/sync/cache.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SyncResult } from '../types.js';

export class CacheManager {
  private cacheRoot: string;

  constructor(cacheRoot?: string) {
    this.cacheRoot =
      cacheRoot || join(homedir(), '.claude', 'plugins', 'cache');
  }

  getCachePath(marketplaceName: string): string {
    return join(this.cacheRoot, marketplaceName);
  }

  getPluginCachePath(marketplaceName: string, pluginName: string): string {
    return join(this.cacheRoot, marketplaceName, pluginName);
  }

  async clearCache(marketplaceName: string): Promise<SyncResult> {
    const cachePath = this.getCachePath(marketplaceName);

    try {
      await fs.rm(cachePath, { recursive: true, force: true });
      return {
        success: true,
        message: `Cleared cache: ${cachePath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cacheExists(marketplaceName: string): Promise<boolean> {
    const cachePath = this.getCachePath(marketplaceName);
    try {
      await fs.access(cachePath);
      return true;
    } catch {
      return false;
    }
  }
}
