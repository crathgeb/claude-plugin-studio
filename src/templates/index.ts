// src/templates/index.ts
import type { MarketplacePluginEntry } from '../types.js';

export interface MarketplaceOptions {
  name: string;
  ownerName: string;
  ownerEmail?: string;
  description?: string;
}

export interface PluginOptions {
  name: string;
  description?: string;
}

export class Templates {
  static marketplaceJson(options: MarketplaceOptions): string {
    const manifest: Record<string, unknown> = {
      name: options.name,
      version: '1.0.0',
      owner: {
        name: options.ownerName,
        ...(options.ownerEmail && { email: options.ownerEmail })
      },
      plugins: []
    };
    if (options.description) {
      manifest.description = options.description;
    }
    return JSON.stringify(manifest, null, 2);
  }

  static pluginJson(options: PluginOptions): string {
    const manifest: Record<string, unknown> = {
      name: options.name,
      version: '1.0.0'
    };
    if (options.description) {
      manifest.description = options.description;
    }
    return JSON.stringify(manifest, null, 2);
  }

  static pluginEntry(name: string): MarketplacePluginEntry {
    return {
      name,
      source: `./${name}`
    };
  }

  static helloWorldSkill(): string {
    return `---
name: hello-world
description: A simple greeting skill to test your plugin setup
---

# Hello World

Greet the user with a friendly message.

## Instructions

When invoked, respond with a warm, friendly greeting. You can personalize it based on context if available.
`;
  }
}
