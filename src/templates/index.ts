// src/templates/index.ts
import type { MarketplacePluginEntry } from '../types.js';

export class Templates {
  static marketplaceJson(name: string, ownerName: string): string {
    const manifest = {
      name,
      owner: { name: ownerName },
      plugins: []
    };
    return JSON.stringify(manifest, null, 2);
  }

  static pluginJson(name: string): string {
    const manifest = {
      name,
      version: '1.0.0',
      skills: 'skills'
    };
    return JSON.stringify(manifest, null, 2);
  }

  static sampleSkill(): string {
    return `---
name: summarize-project
description: Summarize the current project structure and purpose
---

# Summarize Project

Analyze the current project and provide a concise summary.

## Instructions

1. Read the project's README.md if it exists
2. Scan the directory structure to understand the layout
3. Look for package.json, pyproject.toml, or similar config files
4. Provide a brief summary including:
   - What the project does
   - Main technologies used
   - Key directories and their purposes

Keep the summary under 200 words.
`;
  }

  static pluginEntry(name: string): MarketplacePluginEntry {
    return {
      name,
      source: `./${name}`
    };
  }
}
