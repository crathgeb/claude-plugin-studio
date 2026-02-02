#!/usr/bin/env node
// src/cli.ts
import { program } from 'commander';
import chalk from 'chalk';
import { Scanner } from './scanner.js';
import { Watcher } from './watcher.js';
import { Validator } from './validator/index.js';
import { Syncer } from './sync/index.js';
import { Prompt } from './ui/prompt.js';
import { Logger } from './ui/logger.js';
import type { Verbosity, DiscoveredItem } from './types.js';

const VERSION = '0.1.0';

program
  .name('cps')
  .description('Claude Plugin Studio - Watch, validate, and sync Claude Code plugins')
  .version(VERSION)
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity: Verbosity = options.quiet
      ? 'quiet'
      : options.verbose
        ? 'verbose'
        : 'normal';

    await watchCommand(verbosity);
  });

program
  .command('validate')
  .description('Validate plugins/marketplaces without watching')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity: Verbosity = options.quiet
      ? 'quiet'
      : options.verbose
        ? 'verbose'
        : 'normal';

    await validateCommand(verbosity);
  });

async function watchCommand(verbosity: Verbosity): Promise<void> {
  const logger = new Logger(verbosity);
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
    logger.info(`Validating ${item.name}...`);

    // Run validation
    const result =
      item.type === 'marketplace'
        ? await validator.validateMarketplace(item.path)
        : await validator.validatePlugin(item.path);

    if (!result.valid) {
      logger.validationError(result.errors);
      return;
    }

    logger.success('Valid. Syncing...');

    // Sync
    const syncResult =
      item.type === 'marketplace'
        ? await syncer.syncMarketplace(item.name, item.path)
        : await syncer.syncPlugin(item.name, item.path);

    if (syncResult.success) {
      logger.success(`Synced ${item.name}`);
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

async function validateCommand(verbosity: Verbosity): Promise<void> {
  const logger = new Logger(verbosity);
  const scanner = new Scanner(process.cwd());
  const validator = new Validator();

  logger.info('Scanning for plugins and marketplaces...');
  const items = await scanner.scan();

  if (items.length === 0) {
    logger.error('No plugins or marketplaces found.');
    process.exit(1);
  }

  let hasErrors = false;

  for (const item of items) {
    logger.info(`Validating ${item.name}...`);

    const result =
      item.type === 'marketplace'
        ? await validator.validateMarketplace(item.path)
        : await validator.validatePlugin(item.path);

    if (result.valid) {
      logger.success(`${item.name} is valid`);
    } else {
      hasErrors = true;
      logger.validationError(result.errors);
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

program.parse();
