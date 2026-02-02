// src/ui/logger.ts
import chalk from 'chalk';
import type { Verbosity } from '../types.js';

export class Logger {
  constructor(private verbosity: Verbosity) {}

  private timestamp(): string {
    const now = new Date();
    return chalk.gray(
      `[${now.toLocaleTimeString('en-US', { hour12: false })}]`
    );
  }

  debug(message: string): void {
    if (this.verbosity === 'verbose') {
      console.log(`${this.timestamp()} ${chalk.dim(message)}`);
    }
  }

  info(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${message}`);
    }
  }

  success(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${chalk.green('✓')} ${message}`);
    }
  }

  warn(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${chalk.yellow('⚠')} ${message}`);
    }
  }

  error(message: string): void {
    console.error(`${this.timestamp()} ${chalk.red('✗')} ${message}`);
  }

  validationError(errors: Array<{ message: string }>): void {
    console.error(`${this.timestamp()} ${chalk.red('✗')} Validation failed:`);
    for (const err of errors) {
      console.error(`           ${chalk.red('-')} ${err.message}`);
    }
    console.error(
      `${this.timestamp()} ${chalk.yellow('⏸')} Sync blocked until errors are fixed`
    );
  }

  change(filePath: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(
        `${this.timestamp()} ${chalk.cyan('Change detected:')} ${filePath}`
      );
    }
  }

  command(cmd: string): void {
    if (this.verbosity === 'verbose') {
      console.log(`${this.timestamp()} ${chalk.dim('Running:')} ${cmd}`);
    }
  }
}
