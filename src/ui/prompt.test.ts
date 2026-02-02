// src/ui/prompt.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';
import { Prompt } from './prompt.js';
import type { DiscoveredItem } from '../types.js';

vi.mock('inquirer');

describe('Prompt', () => {
  let prompt: Prompt;

  beforeEach(() => {
    prompt = new Prompt();
    vi.clearAllMocks();
  });

  it('builds choices from discovered items', () => {
    const items: DiscoveredItem[] = [
      {
        type: 'marketplace',
        name: 'my-market',
        path: '/path/to/market',
        manifestPath: '/path/to/market/.claude-plugin/marketplace.json'
      },
      {
        type: 'plugin',
        name: 'my-plugin',
        path: '/path/to/plugin',
        manifestPath: '/path/to/plugin/.claude-plugin/plugin.json'
      }
    ];

    const choices = prompt.buildChoices(items);

    expect(choices).toHaveLength(2);
    expect(choices[0].name).toContain('marketplace');
    expect(choices[0].name).toContain('my-market');
    expect(choices[1].name).toContain('plugin');
    expect(choices[1].name).toContain('my-plugin');
  });

  describe('askMarketplaceName', () => {
    it('returns user input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ name: 'my-marketplace' });

      const result = await prompt.askMarketplaceName();

      expect(result).toBe('my-marketplace');
    });
  });

  describe('askOwnerName', () => {
    it('returns user input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ ownerName: 'John Doe' });

      const result = await prompt.askOwnerName();

      expect(result).toBe('John Doe');
    });
  });

  describe('askPluginName', () => {
    it('returns user input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ name: 'my-plugin' });

      const result = await prompt.askPluginName();

      expect(result).toBe('my-plugin');
    });
  });

  describe('askCreatePlugin', () => {
    it('returns true when user confirms', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ createPlugin: true });

      const result = await prompt.askCreatePlugin();

      expect(result).toBe(true);
    });

    it('returns false when user declines', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ createPlugin: false });

      const result = await prompt.askCreatePlugin();

      expect(result).toBe(false);
    });
  });

  describe('askOwnerEmail', () => {
    it('returns user input trimmed', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ email: '  john@example.com  ' });

      const result = await prompt.askOwnerEmail();

      expect(result).toBe('john@example.com');
    });

    it('returns empty string when no input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ email: '' });

      const result = await prompt.askOwnerEmail();

      expect(result).toBe('');
    });
  });

  describe('askDescription', () => {
    it('returns user input for marketplace', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ description: 'My marketplace' });

      const result = await prompt.askDescription('marketplace');

      expect(result).toBe('My marketplace');
    });

    it('returns user input for plugin', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ description: 'My plugin' });

      const result = await prompt.askDescription('plugin');

      expect(result).toBe('My plugin');
    });
  });
});
