// src/sync/index.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Syncer } from './index.js';
import { Logger } from '../ui/logger.js';

describe('Syncer', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger('quiet');
  });

  it('exposes sync method', () => {
    const syncer = new Syncer(mockLogger);
    expect(typeof syncer.syncMarketplace).toBe('function');
  });

  it('exposes syncPlugin method', () => {
    const syncer = new Syncer(mockLogger);
    expect(typeof syncer.syncPlugin).toBe('function');
  });
});
