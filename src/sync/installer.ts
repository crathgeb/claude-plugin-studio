// src/sync/installer.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SyncResult } from '../types.js';

const execAsync = promisify(exec);

export class Installer {
  buildMarketplaceRemoveCommand(marketplaceName: string): string {
    return `claude plugin marketplace remove ${marketplaceName}`;
  }

  buildMarketplaceAddCommand(marketplacePath: string): string {
    return `claude plugin marketplace add "${marketplacePath}"`;
  }

  buildPluginInstallCommand(
    pluginName: string,
    marketplaceName: string
  ): string {
    return `claude plugin install ${pluginName}@${marketplaceName}`;
  }

  async removeMarketplace(marketplaceName: string): Promise<SyncResult> {
    const cmd = this.buildMarketplaceRemoveCommand(marketplaceName);

    try {
      await execAsync(cmd, { timeout: 60000 });
      return {
        success: true,
        message: `Removed marketplace ${marketplaceName}`
      };
    } catch (error: unknown) {
      // Ignore errors - marketplace might not exist
      return {
        success: true,
        message: `Marketplace ${marketplaceName} not installed (ok)`
      };
    }
  }

  async addMarketplace(marketplacePath: string): Promise<SyncResult> {
    const cmd = this.buildMarketplaceAddCommand(marketplacePath);

    try {
      await execAsync(cmd, { timeout: 60000 });
      return {
        success: true,
        message: `Added marketplace from ${marketplacePath}`
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to add marketplace: ${message}`
      };
    }
  }

  async installPlugin(
    pluginName: string,
    marketplaceName: string
  ): Promise<SyncResult> {
    const cmd = this.buildPluginInstallCommand(pluginName, marketplaceName);

    try {
      await execAsync(cmd, { timeout: 60000 });
      return {
        success: true,
        message: `Installed ${pluginName}@${marketplaceName}`
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to install plugin: ${message}`
      };
    }
  }
}
