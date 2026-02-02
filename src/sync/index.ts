// src/sync/index.ts
import { CacheManager } from './cache.js';
import { Installer } from './installer.js';
import { SettingsReader } from './settings.js';
import { Logger } from '../ui/logger.js';
import type { SyncResult } from '../types.js';

export class Syncer {
  private cacheManager = new CacheManager();
  private installer = new Installer();
  private settingsReader = new SettingsReader();

  constructor(private logger: Logger) {}

  async syncMarketplace(
    marketplaceName: string,
    marketplacePath: string
  ): Promise<SyncResult> {
    // Step 1: Clear cache
    this.logger.debug(`Clearing cache for ${marketplaceName}`);
    const clearResult = await this.cacheManager.clearCache(marketplaceName);
    if (!clearResult.success) {
      this.logger.error(clearResult.message);
      return clearResult;
    }
    this.logger.info(`Cleared cache: ${this.cacheManager.getCachePath(marketplaceName)}`);

    // Step 2: Re-add marketplace
    this.logger.command(this.installer.buildMarketplaceAddCommand(marketplacePath));
    const addResult = await this.installer.addMarketplace(marketplacePath);
    if (!addResult.success) {
      this.logger.error(addResult.message);
      return addResult;
    }
    this.logger.debug(addResult.message);

    // Step 3: Reinstall previously installed plugins
    const installedPlugins =
      await this.settingsReader.getInstalledPlugins(marketplaceName);

    for (const pluginName of installedPlugins) {
      this.logger.command(
        this.installer.buildPluginInstallCommand(pluginName, marketplaceName)
      );
      const installResult = await this.installer.installPlugin(
        pluginName,
        marketplaceName
      );
      if (!installResult.success) {
        this.logger.warn(
          `Failed to reinstall ${pluginName}: ${installResult.message}`
        );
      } else {
        this.logger.debug(installResult.message);
      }
    }

    return {
      success: true,
      message: `Synced ${marketplaceName}`
    };
  }

  async syncPlugin(
    pluginName: string,
    _pluginPath: string
  ): Promise<SyncResult> {
    // For standalone plugins (not in a marketplace), we can't auto-sync
    // Users should use --plugin-dir flag during development
    this.logger.warn(
      `Standalone plugin "${pluginName}" detected. Use --plugin-dir flag with Claude Code for development.`
    );
    this.logger.info('Restart Claude Code to pick up changes.');

    return {
      success: true,
      message: `Plugin ${pluginName} change detected. Restart Claude Code.`
    };
  }
}

export { CacheManager } from './cache.js';
export { Installer } from './installer.js';
export { SettingsReader } from './settings.js';
