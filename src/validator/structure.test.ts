// src/validator/structure.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StructureValidator } from './structure.js';

describe('StructureValidator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-struct-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('plugin structure', () => {
    it('passes when referenced directories exist', async () => {
      await fs.mkdir(join(testDir, 'skills'), { recursive: true });
      await fs.mkdir(join(testDir, 'commands'), { recursive: true });

      const validator = new StructureValidator();
      const result = await validator.validatePlugin(testDir, {
        name: 'test-plugin',
        skills: './skills',
        commands: './commands'
      });

      expect(result.valid).toBe(true);
    });

    it('fails when referenced directory is missing', async () => {
      const validator = new StructureValidator();
      const result = await validator.validatePlugin(testDir, {
        name: 'test-plugin',
        skills: './skills'
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('skills');
    });
  });

  describe('marketplace structure', () => {
    it('passes when plugin source paths exist', async () => {
      const pluginDir = join(testDir, 'plugins', 'my-plugin', '.claude-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(
        join(pluginDir, 'plugin.json'),
        JSON.stringify({ name: 'my-plugin' })
      );

      const validator = new StructureValidator();
      const result = await validator.validateMarketplace(testDir, {
        name: 'test-market',
        owner: { name: 'Test' },
        plugins: [{ name: 'my-plugin', source: './plugins/my-plugin' }]
      });

      expect(result.valid).toBe(true);
    });

    it('fails when plugin source path is missing', async () => {
      const validator = new StructureValidator();
      const result = await validator.validateMarketplace(testDir, {
        name: 'test-market',
        owner: { name: 'Test' },
        plugins: [{ name: 'my-plugin', source: './plugins/missing' }]
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('missing');
    });

    it('skips validation for non-relative sources', async () => {
      const validator = new StructureValidator();
      const result = await validator.validateMarketplace(testDir, {
        name: 'test-market',
        owner: { name: 'Test' },
        plugins: [
          {
            name: 'remote-plugin',
            source: { source: 'github', repo: 'owner/repo' }
          }
        ]
      });

      expect(result.valid).toBe(true);
    });
  });
});
