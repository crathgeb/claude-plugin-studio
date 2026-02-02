// src/sync/installer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Installer } from './installer.js';

describe('Installer', () => {
  it('builds correct marketplace add command', () => {
    const installer = new Installer();
    const cmd = installer.buildMarketplaceAddCommand('/path/to/marketplace');

    expect(cmd).toBe('claude plugin marketplace add "/path/to/marketplace"');
  });

  it('builds correct plugin install command', () => {
    const installer = new Installer();
    const cmd = installer.buildPluginInstallCommand(
      'my-plugin',
      'my-marketplace'
    );

    expect(cmd).toBe('claude plugin install my-plugin@my-marketplace');
  });

  it('handles paths with spaces', () => {
    const installer = new Installer();
    const cmd = installer.buildMarketplaceAddCommand('/path/with spaces/market');

    expect(cmd).toBe('claude plugin marketplace add "/path/with spaces/market"');
  });
});
