// src/validator/index.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { SchemaValidator } from './schema.js';
import { StructureValidator } from './structure.js';
import { ClaudeCliValidator } from './claude-cli.js';
import type {
  ValidationResult,
  ValidationError,
  PluginManifest,
  MarketplaceManifest
} from '../types.js';

export class Validator {
  private schemaValidator = new SchemaValidator();
  private structureValidator = new StructureValidator();
  private claudeCliValidator = new ClaudeCliValidator();

  async validatePlugin(pluginPath: string): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];

    // Read manifest
    const manifestPath = join(pluginPath, '.claude-plugin', 'plugin.json');
    let manifest: PluginManifest;
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            layer: 'schema',
            message: `Failed to read plugin.json: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ]
      };
    }

    // Layer 1: Schema validation
    const schemaResult = this.schemaValidator.validatePlugin(manifest);
    if (!schemaResult.valid) {
      return schemaResult; // Stop on schema errors
    }

    // Layer 2: Structure validation
    const structureResult = await this.structureValidator.validatePlugin(
      pluginPath,
      manifest
    );
    if (!structureResult.valid) {
      return structureResult; // Stop on structure errors
    }

    // Layer 3: Claude CLI validation
    const cliResult = await this.claudeCliValidator.validate(pluginPath);
    if (!cliResult.valid) {
      return cliResult;
    }

    return { valid: true, errors: [] };
  }

  async validateMarketplace(marketplacePath: string): Promise<ValidationResult> {
    // Read manifest
    const manifestPath = join(
      marketplacePath,
      '.claude-plugin',
      'marketplace.json'
    );
    let manifest: MarketplaceManifest;
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            layer: 'schema',
            message: `Failed to read marketplace.json: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ]
      };
    }

    // Layer 1: Schema validation
    const schemaResult = this.schemaValidator.validateMarketplace(manifest);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    // Layer 2: Structure validation
    const structureResult = await this.structureValidator.validateMarketplace(
      marketplacePath,
      manifest
    );
    if (!structureResult.valid) {
      return structureResult;
    }

    // Layer 3: Claude CLI validation
    const cliResult = await this.claudeCliValidator.validate(marketplacePath);
    if (!cliResult.valid) {
      return cliResult;
    }

    return { valid: true, errors: [] };
  }
}

export { SchemaValidator } from './schema.js';
export { StructureValidator } from './structure.js';
export { ClaudeCliValidator } from './claude-cli.js';
