// src/watcher.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Watcher } from './watcher.js';
import { Logger } from './ui/logger.js';
import type { DiscoveredItem } from './types.js';

describe('Watcher', () => {
  let testDir: string;
  let mockLogger: Logger;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-watcher-test-'));
    mockLogger = new Logger('quiet');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns watch patterns for marketplace', () => {
    const item: DiscoveredItem = {
      type: 'marketplace',
      name: 'test-market',
      path: testDir,
      manifestPath: join(testDir, '.claude-plugin', 'marketplace.json')
    };

    const watcher = new Watcher(mockLogger);
    const patterns = watcher.getWatchPatterns(item);

    expect(patterns).toContain(join(testDir, '.claude-plugin', '**/*'));
    expect(patterns).toContain(join(testDir, 'skills', '**/*'));
    expect(patterns).toContain(join(testDir, 'commands', '**/*'));
  });

  it('returns watch patterns for plugin', () => {
    const item: DiscoveredItem = {
      type: 'plugin',
      name: 'test-plugin',
      path: testDir,
      manifestPath: join(testDir, '.claude-plugin', 'plugin.json')
    };

    const watcher = new Watcher(mockLogger);
    const patterns = watcher.getWatchPatterns(item);

    expect(patterns).toContain(join(testDir, '.claude-plugin', '**/*'));
    expect(patterns).toContain(join(testDir, 'skills', '**/*'));
  });
});
