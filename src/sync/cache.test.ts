// src/sync/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { CacheManager } from './cache.js';

describe('CacheManager', () => {
  it('returns correct cache path for marketplace', () => {
    const manager = new CacheManager();
    const cachePath = manager.getCachePath('my-marketplace');

    expect(cachePath).toBe(
      join(homedir(), '.claude', 'plugins', 'cache', 'my-marketplace')
    );
  });

  it('returns correct cache path for plugin in marketplace', () => {
    const manager = new CacheManager();
    const cachePath = manager.getPluginCachePath('my-marketplace', 'my-plugin');

    expect(cachePath).toContain('my-marketplace');
    expect(cachePath).toContain('my-plugin');
  });

  describe('clearCache', () => {
    let testCacheDir: string;
    let manager: CacheManager;

    beforeEach(async () => {
      testCacheDir = await fs.mkdtemp(join(tmpdir(), 'cps-cache-test-'));
      manager = new CacheManager(testCacheDir);
    });

    afterEach(async () => {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    });

    it('removes existing cache directory', async () => {
      const marketplaceCache = join(testCacheDir, 'test-market');
      await fs.mkdir(marketplaceCache, { recursive: true });
      await fs.writeFile(join(marketplaceCache, 'test.txt'), 'test');

      const result = await manager.clearCache('test-market');

      expect(result.success).toBe(true);
      const exists = await fs
        .access(marketplaceCache)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('succeeds when cache does not exist', async () => {
      const result = await manager.clearCache('nonexistent-market');
      expect(result.success).toBe(true);
    });
  });
});
