// src/commands/watch.ts
import chalk from 'chalk';
import { Scanner } from '../scanner.js';
import { Watcher } from '../watcher.js';
import { Validator } from '../validator/index.js';
import { Syncer } from '../sync/index.js';
import { Prompt } from '../ui/prompt.js';
import { Logger } from '../ui/logger.js';
import type { Verbosity, DiscoveredItem } from '../types.js';

export class WatchCommand {
  constructor(private verbosity: Verbosity) {}

  async run(): Promise<void> {
    const logger = new Logger(this.verbosity);
    const scanner = new Scanner(process.cwd());
    const prompt = new Prompt();
    const validator = new Validator();
    const syncer = new Syncer(logger);
    const watcher = new Watcher(logger);

    // Scan for plugins/marketplaces
    logger.info('Scanning for plugins and marketplaces...');
    const items = await scanner.scan();

    if (items.length === 0) {
      logger.error(
        'No plugins or marketplaces found. Make sure you have a .claude-plugin directory with plugin.json or marketplace.json.'
      );
      process.exit(1);
    }

    // Select items to watch
    const selected = await prompt.selectItems(items);

    if (selected.length === 0) {
      logger.error('No items selected. Exiting.');
      process.exit(1);
    }

    // Find parent marketplace for a plugin (if any)
    const findParentMarketplace = (pluginPath: string): DiscoveredItem | undefined => {
      return selected.find(
        (s) => s.type === 'marketplace' && pluginPath.startsWith(s.path + '/')
      );
    };

    // Get unique marketplaces to sync (including parent marketplaces of selected plugins)
    const marketplacesToSync = new Map<string, DiscoveredItem>();
    for (const item of selected) {
      if (item.type === 'marketplace') {
        marketplacesToSync.set(item.name, item);
      } else {
        const parent = findParentMarketplace(item.path);
        if (parent) {
          marketplacesToSync.set(parent.name, parent);
        }
      }
    }

    // Initial sync
    logger.info('');
    logger.info(chalk.bold('Initial sync...'));
    for (const marketplace of marketplacesToSync.values()) {
      logger.info(`Validating ${marketplace.name}...`);

      const result = await validator.validateMarketplace(marketplace.path);
      if (!result.valid) {
        logger.validationError(result.errors);
        continue;
      }

      logger.success('Valid. Syncing...');
      const syncResult = await syncer.syncMarketplace(marketplace.name, marketplace.path);
      if (syncResult.success) {
        logger.success(`Synced ${marketplace.name}`);
      } else {
        logger.error(syncResult.message);
      }
    }

    // Log what we're watching
    logger.info('');
    logger.info(chalk.bold('Watching:'));
    for (const item of selected) {
      logger.info(
        `  ${chalk.cyan(item.type === 'marketplace' ? '[marketplace]' : '[plugin]')} ${item.name}`
      );
    }
    logger.info('');
    logger.info(chalk.gray('Press Ctrl+C to stop'));
    logger.info('');

    // Handle changes
    const handleChange = async (item: DiscoveredItem) => {
      // If this is a plugin inside a marketplace, sync the marketplace instead
      let syncTarget = item;
      if (item.type === 'plugin') {
        const parentMarketplace = findParentMarketplace(item.path);
        if (parentMarketplace) {
          syncTarget = parentMarketplace;
          logger.info(`Plugin ${item.name} is part of marketplace ${parentMarketplace.name}`);
        }
      }

      logger.info(`Validating ${syncTarget.name}...`);

      // Run validation
      const result =
        syncTarget.type === 'marketplace'
          ? await validator.validateMarketplace(syncTarget.path)
          : await validator.validatePlugin(syncTarget.path);

      if (!result.valid) {
        logger.validationError(result.errors);
        return;
      }

      logger.success('Valid. Syncing...');

      // Sync
      const syncResult =
        syncTarget.type === 'marketplace'
          ? await syncer.syncMarketplace(syncTarget.name, syncTarget.path)
          : await syncer.syncPlugin(syncTarget.name, syncTarget.path);

      if (syncResult.success) {
        logger.success(`Synced ${syncTarget.name}`);
      } else {
        logger.error(syncResult.message);
      }
    };

    // Start watching
    watcher.watch(selected, handleChange);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('');
      logger.info('Stopping...');
      await watcher.stop();
      process.exit(0);
    });
  }
}
