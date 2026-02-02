// src/ui/logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs info messages in normal mode', () => {
    const logger = new Logger('normal');
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('suppresses info messages in quiet mode', () => {
    const logger = new Logger('quiet');
    logger.info('test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs debug messages only in verbose mode', () => {
    const loggerNormal = new Logger('normal');
    const loggerVerbose = new Logger('verbose');

    loggerNormal.debug('debug message');
    expect(consoleSpy).not.toHaveBeenCalled();

    loggerVerbose.debug('debug message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('always logs errors regardless of verbosity', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger('quiet');
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
