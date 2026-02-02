#!/usr/bin/env node
// src/cli.ts
import { program } from 'commander';
import { Scanner } from './scanner.js';
import { Validator } from './validator/index.js';
import { Logger } from './ui/logger.js';
import { Prompt } from './ui/prompt.js';
import { Scaffolder } from './scaffolder.js';
import { WatchCommand } from './commands/watch.js';
import { CreateCommand } from './commands/create.js';
import type { Verbosity } from './types.js';

const VERSION = '0.1.0';

function getVerbosity(options: { verbose?: boolean; quiet?: boolean }): Verbosity {
  if (options.quiet) return 'quiet';
  if (options.verbose) return 'verbose';
  return 'normal';
}

program
  .name('cps')
  .description('Claude Plugin Studio - Watch, validate, and sync Claude Code plugins')
  .version(VERSION);

// Default action (backwards compatibility) - runs watch
program
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const watchCmd = new WatchCommand(getVerbosity(options));
    await watchCmd.run();
  });

// Explicit watch command
program
  .command('watch')
  .description('Watch plugins/marketplaces for changes and auto-sync')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const watchCmd = new WatchCommand(getVerbosity(options));
    await watchCmd.run();
  });

// Validate command
program
  .command('validate')
  .description('Validate plugins/marketplaces without watching')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity = getVerbosity(options);
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
  });

// Create command
program
  .command('create')
  .description('Create a new marketplace or plugin')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity = getVerbosity(options);
    const logger = new Logger(verbosity);
    const prompt = new Prompt();
    const scaffolder = new Scaffolder(process.cwd());
    const createCmd = new CreateCommand(scaffolder, prompt, logger);

    await createCmd.run();
  });

program.parse();
