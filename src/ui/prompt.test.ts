// src/ui/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { Prompt } from './prompt.js';
import type { DiscoveredItem } from '../types.js';

describe('Prompt', () => {
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

    const prompt = new Prompt();
    const choices = prompt.buildChoices(items);

    expect(choices).toHaveLength(2);
    expect(choices[0].name).toContain('marketplace');
    expect(choices[0].name).toContain('my-market');
    expect(choices[1].name).toContain('plugin');
    expect(choices[1].name).toContain('my-plugin');
  });
});
