// src/validator/schema.test.ts
import { describe, it, expect } from 'vitest';
import { SchemaValidator } from './schema.js';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  describe('plugin validation', () => {
    it('accepts valid plugin manifest', () => {
      const result = validator.validatePlugin({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires name field', () => {
      const result = validator.validatePlugin({
        version: '1.0.0'
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('name');
    });

    it('validates name is kebab-case', () => {
      const result = validator.validatePlugin({
        name: 'My Plugin'
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('pattern');
    });
  });

  describe('marketplace validation', () => {
    it('accepts valid marketplace manifest', () => {
      const result = validator.validateMarketplace({
        name: 'my-marketplace',
        owner: { name: 'Test User' },
        plugins: [
          { name: 'plugin-a', source: './plugins/a' }
        ]
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires owner field', () => {
      const result = validator.validateMarketplace({
        name: 'my-marketplace',
        plugins: []
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('owner');
    });

    it('requires plugins array', () => {
      const result = validator.validateMarketplace({
        name: 'my-marketplace',
        owner: { name: 'Test' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('plugins');
    });
  });
});
