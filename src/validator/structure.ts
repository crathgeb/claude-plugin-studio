// src/validator/structure.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type {
  ValidationResult,
  ValidationError,
  PluginManifest,
  MarketplaceManifest
} from '../types.js';

export class StructureValidator {
  async validatePlugin(
    pluginPath: string,
    manifest: PluginManifest
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check referenced component directories
    const pathFields = ['commands', 'agents', 'skills', 'hooks'] as const;

    for (const field of pathFields) {
      const value = manifest[field];
      if (typeof value === 'string') {
        const exists = await this.pathExists(join(pluginPath, value));
        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Directory "${value}" referenced in "${field}" does not exist`,
            path: field
          });
        }
      } else if (Array.isArray(value)) {
        for (const p of value) {
          const exists = await this.pathExists(join(pluginPath, p));
          if (!exists) {
            errors.push({
              layer: 'structure',
              message: `Path "${p}" referenced in "${field}" does not exist`,
              path: field
            });
          }
        }
      }
    }

    // Check MCP/LSP config files if specified as strings
    for (const field of ['mcpServers', 'lspServers'] as const) {
      const value = manifest[field];
      if (typeof value === 'string') {
        const exists = await this.pathExists(join(pluginPath, value));
        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Config file "${value}" referenced in "${field}" does not exist`,
            path: field
          });
        }
      }
    }

    // Check default directories if they're likely expected
    const defaultDirs = ['skills', 'commands', 'agents'];
    for (const dir of defaultDirs) {
      const dirPath = join(pluginPath, dir);
      const exists = await this.pathExists(dirPath);
      if (exists) {
        // Directory exists, validate it has content
        const entries = await fs.readdir(dirPath).catch(() => []);
        if (entries.length === 0) {
          // Just a warning, not an error - could add warnings later
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateMarketplace(
    marketplacePath: string,
    manifest: MarketplaceManifest
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const pluginRoot = manifest.metadata?.pluginRoot || '';

    for (const plugin of manifest.plugins) {
      // Only validate relative path sources
      if (typeof plugin.source === 'string' && plugin.source.startsWith('./')) {
        const sourcePath = join(marketplacePath, pluginRoot, plugin.source);
        const exists = await this.pathExists(sourcePath);

        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Plugin "${plugin.name}" source path "${plugin.source}" does not exist`,
            path: `plugins.${plugin.name}.source`
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}
