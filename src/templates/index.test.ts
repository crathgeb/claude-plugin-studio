// src/templates/index.test.ts
import { describe, it, expect } from 'vitest';
import { Templates } from './index.js';

describe('Templates', () => {
  describe('marketplaceJson', () => {
    it('generates valid marketplace.json content', () => {
      const result = Templates.marketplaceJson('my-marketplace', 'John Doe');
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('my-marketplace');
      expect(parsed.owner.name).toBe('John Doe');
      expect(parsed.plugins).toEqual([]);
    });
  });

  describe('pluginJson', () => {
    it('generates valid plugin.json content', () => {
      const result = Templates.pluginJson('my-plugin');
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('my-plugin');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.skills).toBe('skills');
    });
  });

  describe('sampleSkill', () => {
    it('generates skill with frontmatter', () => {
      const result = Templates.sampleSkill();

      expect(result).toContain('---');
      expect(result).toContain('name: summarize-project');
      expect(result).toContain('description:');
    });
  });

  describe('pluginEntry', () => {
    it('generates marketplace plugin entry', () => {
      const result = Templates.pluginEntry('my-plugin');

      expect(result.name).toBe('my-plugin');
      expect(result.source).toBe('./my-plugin');
    });
  });
});
