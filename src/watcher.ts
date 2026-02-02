// src/watcher.ts
import chokidar, { FSWatcher } from 'chokidar';
import { join, relative } from 'node:path';
import { Logger } from './ui/logger.js';
import type { DiscoveredItem } from './types.js';

type ChangeHandler = (item: DiscoveredItem, changedPath: string) => void;

export class Watcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;

  constructor(private logger: Logger) {}

  getWatchPatterns(item: DiscoveredItem): string[] {
    const base = item.path;
    // Chokidar 4.x removed glob support - use directory paths instead
    // Chokidar watches directories recursively by default
    return [
      join(base, '.claude-plugin'),
      join(base, 'skills'),
      join(base, 'commands'),
      join(base, 'agents'),
      join(base, 'hooks'),
      join(base, '.mcp.json'),
      join(base, '.lsp.json')
    ];
  }

  watch(items: DiscoveredItem[], onChange: ChangeHandler): void {
    for (const item of items) {
      const patterns = this.getWatchPatterns(item);

      this.logger.debug(`Watching ${item.name}: ${patterns.length} patterns`);

      const watcher = chokidar.watch(patterns, {
        ignoreInitial: true,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**'
        ]
      });

      watcher.on('all', (event, path) => {
        this.handleChange(item, path, onChange);
      });

      watcher.on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Watcher error for ${item.name}: ${message}`);
      });

      this.watchers.set(item.name, watcher);
    }
  }

  private handleChange(
    item: DiscoveredItem,
    changedPath: string,
    onChange: ChangeHandler
  ): void {
    // Clear existing timer for this item
    const existingTimer = this.debounceTimers.get(item.name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      const relativePath = relative(item.path, changedPath);
      this.logger.change(relativePath);
      onChange(item, changedPath);
      this.debounceTimers.delete(item.name);
    }, this.debounceMs);

    this.debounceTimers.set(item.name, timer);
  }

  async stop(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();
  }
}
