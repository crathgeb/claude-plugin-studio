// src/templates/index.test.ts
import { describe, it, expect } from 'vitest';
import { Templates } from './index.js';

describe('Templates', () => {
  describe('marketplaceJson', () => {
    it('generates valid marketplace.json content', () => {
      const result = Templates.marketplaceJson({
        name: 'my-marketplace',
        ownerName: 'John Doe'
      });
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('my-marketplace');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.owner.name).toBe('John Doe');
      expect(parsed.plugins).toEqual([]);
    });

    it('includes email when provided', () => {
      const result = Templates.marketplaceJson({
        name: 'my-marketplace',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com'
      });
      const parsed = JSON.parse(result);

      expect(parsed.owner.email).toBe('john@example.com');
    });

    it('includes description when provided', () => {
      const result = Templates.marketplaceJson({
        name: 'my-marketplace',
        ownerName: 'John Doe',
        description: 'A test marketplace'
      });
      const parsed = JSON.parse(result);

      expect(parsed.description).toBe('A test marketplace');
    });
  });

  describe('pluginJson', () => {
    it('generates valid plugin.json content', () => {
      const result = Templates.pluginJson({ name: 'my-plugin' });
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('my-plugin');
      expect(parsed.version).toBe('1.0.0');
    });

    it('includes description when provided', () => {
      const result = Templates.pluginJson({
        name: 'my-plugin',
        description: 'A test plugin'
      });
      const parsed = JSON.parse(result);

      expect(parsed.description).toBe('A test plugin');
    });
  });

  describe('pluginEntry', () => {
    it('generates marketplace plugin entry', () => {
      const result = Templates.pluginEntry('my-plugin');

      expect(result.name).toBe('my-plugin');
      expect(result.source).toBe('./my-plugin');
    });
  });

  describe('helloWorldSkill', () => {
    it('generates skill with frontmatter', () => {
      const result = Templates.helloWorldSkill();

      expect(result).toContain('---');
      expect(result).toContain('name: hello-world');
      expect(result).toContain('description:');
    });
  });
});
