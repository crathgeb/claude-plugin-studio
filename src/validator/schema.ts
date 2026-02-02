// src/validator/schema.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import pluginSchema from '../schemas/plugin.schema.json' with { type: 'json' };
import marketplaceSchema from '../schemas/marketplace.schema.json' with { type: 'json' };
import type { ValidationResult } from '../types.js';

export class SchemaValidator {
  private ajv: Ajv;
  private validatePluginFn: ReturnType<Ajv['compile']>;
  private validateMarketplaceFn: ReturnType<Ajv['compile']>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.validatePluginFn = this.ajv.compile(pluginSchema);
    this.validateMarketplaceFn = this.ajv.compile(marketplaceSchema);
  }

  validatePlugin(manifest: unknown): ValidationResult {
    const valid = this.validatePluginFn(manifest);
    return {
      valid: !!valid,
      errors: valid
        ? []
        : (this.validatePluginFn.errors || []).map((err) => ({
            layer: 'schema' as const,
            message: `${err.instancePath || 'root'}: ${err.message}`,
            path: err.instancePath || undefined
          }))
    };
  }

  validateMarketplace(manifest: unknown): ValidationResult {
    const valid = this.validateMarketplaceFn(manifest);
    return {
      valid: !!valid,
      errors: valid
        ? []
        : (this.validateMarketplaceFn.errors || []).map((err) => ({
            layer: 'schema' as const,
            message: `${err.instancePath || 'root'}: ${err.message}`,
            path: err.instancePath || undefined
          }))
    };
  }
}
