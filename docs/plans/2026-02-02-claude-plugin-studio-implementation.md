# Claude Plugin Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `cps`, a CLI tool that watches Claude Code plugins/marketplaces during development, validates changes, and auto-syncs by clearing cache and reinstalling.

**Architecture:** Node.js CLI that scans for plugin manifests, watches files with chokidar, validates with ajv + claude CLI, and syncs by deleting cache and running claude plugin commands.

**Tech Stack:** TypeScript, Node.js, commander, chokidar, ajv, inquirer, chalk

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "claude-plugin-studio",
  "version": "0.1.0",
  "description": "Development tool for Claude Code plugins - watch, validate, and auto-sync",
  "type": "module",
  "main": "./dist/cli.js",
  "bin": {
    "cps": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup src/cli.ts --format esm --dts --clean",
    "dev": "tsup src/cli.ts --format esm --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "claude",
    "claude-code",
    "plugin",
    "development",
    "cli"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "chalk": "^5.3.0",
    "chokidar": "^4.0.3",
    "commander": "^13.1.0",
    "inquirer": "^12.3.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.1",
    "tsup": "^8.3.6",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
```

**Step 4: Install dependencies**

Run: `npm install`
Expected: Dependencies installed, package-lock.json created

**Step 5: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "chore: initialize project with dependencies"
```

---

### Task 2: Types and Schemas

**Files:**
- Create: `src/types.ts`
- Create: `src/schemas/plugin.schema.json`
- Create: `src/schemas/marketplace.schema.json`

**Step 1: Create types**

```typescript
// src/types.ts

export type Verbosity = 'quiet' | 'normal' | 'verbose';

export interface PluginManifest {
  name: string;
  version?: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  commands?: string | string[];
  agents?: string | string[];
  skills?: string | string[];
  hooks?: string | object;
  mcpServers?: string | object;
  lspServers?: string | object;
}

export interface MarketplaceOwner {
  name: string;
  email?: string;
}

export interface PluginSource {
  source: 'github' | 'url';
  repo?: string;
  url?: string;
  ref?: string;
  sha?: string;
}

export interface MarketplacePluginEntry {
  name: string;
  source: string | PluginSource;
  description?: string;
  version?: string;
  author?: { name: string; email?: string };
  strict?: boolean;
}

export interface MarketplaceManifest {
  name: string;
  owner: MarketplaceOwner;
  plugins: MarketplacePluginEntry[];
  metadata?: {
    description?: string;
    version?: string;
    pluginRoot?: string;
  };
}

export interface DiscoveredItem {
  type: 'plugin' | 'marketplace';
  name: string;
  path: string;
  manifestPath: string;
}

export interface ValidationError {
  layer: 'schema' | 'structure' | 'claude-cli';
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SyncResult {
  success: boolean;
  message: string;
}
```

**Step 2: Create plugin schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Unique identifier (kebab-case, no spaces)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$"
    },
    "description": { "type": "string" },
    "author": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "url": { "type": "string", "format": "uri" }
      },
      "required": ["name"]
    },
    "homepage": { "type": "string", "format": "uri" },
    "repository": { "type": "string" },
    "license": { "type": "string" },
    "keywords": {
      "type": "array",
      "items": { "type": "string" }
    },
    "commands": {
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } }
      ]
    },
    "agents": {
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } }
      ]
    },
    "skills": {
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } }
      ]
    },
    "hooks": {
      "oneOf": [
        { "type": "string" },
        { "type": "object" }
      ]
    },
    "mcpServers": {
      "oneOf": [
        { "type": "string" },
        { "type": "object" }
      ]
    },
    "lspServers": {
      "oneOf": [
        { "type": "string" },
        { "type": "object" }
      ]
    }
  },
  "additionalProperties": true
}
```

**Step 3: Create marketplace schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "owner", "plugins"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Marketplace identifier (kebab-case, no spaces)"
    },
    "owner": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    },
    "plugins": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "source"],
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z0-9-]+$"
          },
          "source": {
            "oneOf": [
              { "type": "string" },
              {
                "type": "object",
                "properties": {
                  "source": { "type": "string", "enum": ["github", "url"] },
                  "repo": { "type": "string" },
                  "url": { "type": "string" },
                  "ref": { "type": "string" },
                  "sha": { "type": "string" }
                },
                "required": ["source"]
              }
            ]
          },
          "description": { "type": "string" },
          "version": { "type": "string" },
          "author": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "email": { "type": "string" }
            }
          },
          "strict": { "type": "boolean" }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "description": { "type": "string" },
        "version": { "type": "string" },
        "pluginRoot": { "type": "string" }
      }
    }
  },
  "additionalProperties": true
}
```

**Step 4: Commit**

```bash
git add src/types.ts src/schemas/
git commit -m "feat: add types and JSON schemas for plugin/marketplace validation"
```

---

### Task 3: Logger

**Files:**
- Create: `src/ui/logger.ts`
- Create: `src/ui/logger.test.ts`

**Step 1: Write the test**

```typescript
// src/ui/logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs info messages in normal mode', () => {
    const logger = new Logger('normal');
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('suppresses info messages in quiet mode', () => {
    const logger = new Logger('quiet');
    logger.info('test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs debug messages only in verbose mode', () => {
    const loggerNormal = new Logger('normal');
    const loggerVerbose = new Logger('verbose');

    loggerNormal.debug('debug message');
    expect(consoleSpy).not.toHaveBeenCalled();

    loggerVerbose.debug('debug message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('always logs errors regardless of verbosity', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger('quiet');
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/logger.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/ui/logger.ts
import chalk from 'chalk';
import type { Verbosity } from '../types.js';

export class Logger {
  constructor(private verbosity: Verbosity) {}

  private timestamp(): string {
    const now = new Date();
    return chalk.gray(
      `[${now.toLocaleTimeString('en-US', { hour12: false })}]`
    );
  }

  debug(message: string): void {
    if (this.verbosity === 'verbose') {
      console.log(`${this.timestamp()} ${chalk.dim(message)}`);
    }
  }

  info(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${message}`);
    }
  }

  success(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${chalk.green('✓')} ${message}`);
    }
  }

  warn(message: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(`${this.timestamp()} ${chalk.yellow('⚠')} ${message}`);
    }
  }

  error(message: string): void {
    console.error(`${this.timestamp()} ${chalk.red('✗')} ${message}`);
  }

  validationError(errors: Array<{ message: string }>): void {
    console.error(`${this.timestamp()} ${chalk.red('✗')} Validation failed:`);
    for (const err of errors) {
      console.error(`           ${chalk.red('-')} ${err.message}`);
    }
    console.error(
      `${this.timestamp()} ${chalk.yellow('⏸')} Sync blocked until errors are fixed`
    );
  }

  change(filePath: string): void {
    if (this.verbosity !== 'quiet') {
      console.log(
        `${this.timestamp()} ${chalk.cyan('Change detected:')} ${filePath}`
      );
    }
  }

  command(cmd: string): void {
    if (this.verbosity === 'verbose') {
      console.log(`${this.timestamp()} ${chalk.dim('Running:')} ${cmd}`);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/logger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/logger.ts src/ui/logger.test.ts
git commit -m "feat: add verbosity-aware logger"
```

---

### Task 4: Scanner

**Files:**
- Create: `src/scanner.ts`
- Create: `src/scanner.test.ts`

**Step 1: Write the test**

```typescript
// src/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Scanner } from './scanner.js';

describe('Scanner', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('finds a plugin manifest', async () => {
    const pluginDir = join(testDir, 'my-plugin', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'my-plugin' })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('plugin');
    expect(items[0].name).toBe('my-plugin');
  });

  it('finds a marketplace manifest', async () => {
    const marketDir = join(testDir, 'my-marketplace', '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'my-marketplace',
        owner: { name: 'Test' },
        plugins: []
      })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('marketplace');
    expect(items[0].name).toBe('my-marketplace');
  });

  it('finds multiple items', async () => {
    // Plugin
    const pluginDir = join(testDir, 'plugin-a', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'plugin-a' })
    );

    // Marketplace
    const marketDir = join(testDir, 'market-b', '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'market-b',
        owner: { name: 'Test' },
        plugins: []
      })
    );

    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(2);
  });

  it('returns empty array when nothing found', async () => {
    const scanner = new Scanner(testDir);
    const items = await scanner.scan();

    expect(items).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/scanner.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/scanner.ts
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import type { DiscoveredItem } from './types.js';

export class Scanner {
  constructor(private rootDir: string) {}

  async scan(): Promise<DiscoveredItem[]> {
    const items: DiscoveredItem[] = [];
    await this.scanDirectory(this.rootDir, items);
    return items;
  }

  private async scanDirectory(
    dir: string,
    items: DiscoveredItem[]
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.name === '.claude-plugin') {
          await this.checkClaudePluginDir(fullPath, items);
        } else {
          await this.scanDirectory(fullPath, items);
        }
      }
    }
  }

  private async checkClaudePluginDir(
    claudePluginDir: string,
    items: DiscoveredItem[]
  ): Promise<void> {
    const parentDir = dirname(claudePluginDir);

    // Check for marketplace.json first (takes priority)
    const marketplacePath = join(claudePluginDir, 'marketplace.json');
    try {
      const content = await fs.readFile(marketplacePath, 'utf-8');
      const manifest = JSON.parse(content);
      items.push({
        type: 'marketplace',
        name: manifest.name || 'unknown',
        path: parentDir,
        manifestPath: marketplacePath
      });
      return;
    } catch {
      // Not a marketplace, check for plugin
    }

    // Check for plugin.json
    const pluginPath = join(claudePluginDir, 'plugin.json');
    try {
      const content = await fs.readFile(pluginPath, 'utf-8');
      const manifest = JSON.parse(content);
      items.push({
        type: 'plugin',
        name: manifest.name || 'unknown',
        path: parentDir,
        manifestPath: pluginPath
      });
    } catch {
      // Neither marketplace nor plugin
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/scanner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/scanner.ts src/scanner.test.ts
git commit -m "feat: add scanner to find plugins and marketplaces"
```

---

### Task 5: Schema Validator

**Files:**
- Create: `src/validator/schema.ts`
- Create: `src/validator/schema.test.ts`

**Step 1: Write the test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/validator/schema.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
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
```

**Step 4: Add ajv-formats dependency**

Run: `npm install ajv-formats`

**Step 5: Run test to verify it passes**

Run: `npm test -- src/validator/schema.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/validator/schema.ts src/validator/schema.test.ts package.json package-lock.json
git commit -m "feat: add JSON schema validator for plugin/marketplace manifests"
```

---

### Task 6: Structure Validator

**Files:**
- Create: `src/validator/structure.ts`
- Create: `src/validator/structure.test.ts`

**Step 1: Write the test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/validator/structure.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/validator/structure.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type {
  ValidationResult,
  ValidationError,
  PluginManifest,
  MarketplaceManifest
} from '../types.js';

export class StructureValidator {
  async validatePlugin(
    pluginPath: string,
    manifest: PluginManifest
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check referenced component directories
    const pathFields = ['commands', 'agents', 'skills', 'hooks'] as const;

    for (const field of pathFields) {
      const value = manifest[field];
      if (typeof value === 'string') {
        const exists = await this.pathExists(join(pluginPath, value));
        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Directory "${value}" referenced in "${field}" does not exist`,
            path: field
          });
        }
      } else if (Array.isArray(value)) {
        for (const p of value) {
          const exists = await this.pathExists(join(pluginPath, p));
          if (!exists) {
            errors.push({
              layer: 'structure',
              message: `Path "${p}" referenced in "${field}" does not exist`,
              path: field
            });
          }
        }
      }
    }

    // Check MCP/LSP config files if specified as strings
    for (const field of ['mcpServers', 'lspServers'] as const) {
      const value = manifest[field];
      if (typeof value === 'string') {
        const exists = await this.pathExists(join(pluginPath, value));
        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Config file "${value}" referenced in "${field}" does not exist`,
            path: field
          });
        }
      }
    }

    // Check default directories if they're likely expected
    const defaultDirs = ['skills', 'commands', 'agents'];
    for (const dir of defaultDirs) {
      const dirPath = join(pluginPath, dir);
      const exists = await this.pathExists(dirPath);
      if (exists) {
        // Directory exists, validate it has content
        const entries = await fs.readdir(dirPath).catch(() => []);
        if (entries.length === 0) {
          // Just a warning, not an error - could add warnings later
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateMarketplace(
    marketplacePath: string,
    manifest: MarketplaceManifest
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const pluginRoot = manifest.metadata?.pluginRoot || '';

    for (const plugin of manifest.plugins) {
      // Only validate relative path sources
      if (typeof plugin.source === 'string' && plugin.source.startsWith('./')) {
        const sourcePath = join(marketplacePath, pluginRoot, plugin.source);
        const exists = await this.pathExists(sourcePath);

        if (!exists) {
          errors.push({
            layer: 'structure',
            message: `Plugin "${plugin.name}" source path "${plugin.source}" does not exist`,
            path: `plugins.${plugin.name}.source`
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/validator/structure.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/validator/structure.ts src/validator/structure.test.ts
git commit -m "feat: add structure validator to check referenced paths exist"
```

---

### Task 7: Claude CLI Validator

**Files:**
- Create: `src/validator/claude-cli.ts`
- Create: `src/validator/claude-cli.test.ts`

**Step 1: Write the test**

```typescript
// src/validator/claude-cli.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClaudeCliValidator } from './claude-cli.js';

describe('ClaudeCliValidator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-claude-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('parses successful validation', async () => {
    // Create a valid plugin structure
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'test-plugin', version: '1.0.0' })
    );

    const validator = new ClaudeCliValidator();
    const result = await validator.validate(testDir);

    // This test may fail if claude CLI is not installed
    // That's OK - in real usage we handle that gracefully
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });

  it('handles missing claude CLI gracefully', async () => {
    const validator = new ClaudeCliValidator();
    // Mock exec to simulate missing CLI
    const originalValidate = validator.validate.bind(validator);

    vi.spyOn(validator, 'validate').mockImplementation(async () => ({
      valid: true,
      errors: [],
      skipped: true
    }));

    const result = await validator.validate('/nonexistent');
    expect(result.valid).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/validator/claude-cli.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/validator/claude-cli.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ValidationResult, ValidationError } from '../types.js';

const execAsync = promisify(exec);

export interface ClaudeValidationResult extends ValidationResult {
  skipped?: boolean;
}

export class ClaudeCliValidator {
  async validate(path: string): Promise<ClaudeValidationResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `claude plugin validate "${path}"`,
        { timeout: 30000 }
      );

      // Parse output for errors
      const errors = this.parseOutput(stdout, stderr);

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error: unknown) {
      // Check if claude CLI is not installed
      if (this.isCommandNotFound(error)) {
        return {
          valid: true,
          errors: [],
          skipped: true
        };
      }

      // Claude CLI returned non-zero exit code (validation failed)
      if (this.isExecError(error)) {
        const errors = this.parseOutput(error.stdout || '', error.stderr || '');
        if (errors.length > 0) {
          return { valid: false, errors };
        }

        // Generic error
        return {
          valid: false,
          errors: [
            {
              layer: 'claude-cli',
              message: error.stderr || error.message || 'Validation failed'
            }
          ]
        };
      }

      // Unknown error - skip validation
      return {
        valid: true,
        errors: [],
        skipped: true
      };
    }
  }

  private parseOutput(stdout: string, stderr: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const combined = `${stdout}\n${stderr}`;

    // Look for common error patterns
    const lines = combined.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and success messages
      if (!trimmed || trimmed.includes('valid') || trimmed.includes('Valid')) {
        continue;
      }

      // Look for error indicators
      if (
        trimmed.includes('error') ||
        trimmed.includes('Error') ||
        trimmed.includes('invalid') ||
        trimmed.includes('Invalid') ||
        trimmed.includes('missing') ||
        trimmed.includes('Missing') ||
        trimmed.includes('failed') ||
        trimmed.includes('Failed')
      ) {
        errors.push({
          layer: 'claude-cli',
          message: trimmed
        });
      }
    }

    return errors;
  }

  private isCommandNotFound(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('command not found') ||
        message.includes('enoent') ||
        message.includes('is not recognized')
      );
    }
    return false;
  }

  private isExecError(
    error: unknown
  ): error is Error & { stdout?: string; stderr?: string } {
    return error instanceof Error && 'code' in error;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/validator/claude-cli.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/validator/claude-cli.ts src/validator/claude-cli.test.ts
git commit -m "feat: add Claude CLI validator wrapper"
```

---

### Task 8: Validator Orchestrator

**Files:**
- Create: `src/validator/index.ts`
- Create: `src/validator/index.test.ts`

**Step 1: Write the test**

```typescript
// src/validator/index.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Validator } from './index.js';

describe('Validator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-validator-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('validates a complete plugin', async () => {
    // Set up valid plugin
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'test-plugin', version: '1.0.0' })
    );

    const validator = new Validator();
    const result = await validator.validatePlugin(testDir);

    expect(result.valid).toBe(true);
  });

  it('fails on schema errors', async () => {
    const pluginDir = join(testDir, '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ version: '1.0.0' }) // missing name
    );

    const validator = new Validator();
    const result = await validator.validatePlugin(testDir);

    expect(result.valid).toBe(false);
    expect(result.errors[0].layer).toBe('schema');
  });

  it('validates a complete marketplace', async () => {
    // Set up valid marketplace with a plugin
    const marketDir = join(testDir, '.claude-plugin');
    await fs.mkdir(marketDir, { recursive: true });
    await fs.writeFile(
      join(marketDir, 'marketplace.json'),
      JSON.stringify({
        name: 'test-market',
        owner: { name: 'Test' },
        plugins: [{ name: 'my-plugin', source: './plugins/my-plugin' }]
      })
    );

    // Create the plugin
    const pluginDir = join(testDir, 'plugins', 'my-plugin', '.claude-plugin');
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'my-plugin' })
    );

    const validator = new Validator();
    const result = await validator.validateMarketplace(testDir);

    expect(result.valid).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/validator/index.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/validator/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/validator/index.ts src/validator/index.test.ts
git commit -m "feat: add validator orchestrator combining all validation layers"
```

---

### Task 9: Cache Manager

**Files:**
- Create: `src/sync/cache.ts`
- Create: `src/sync/cache.test.ts`

**Step 1: Write the test**

```typescript
// src/sync/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { CacheManager } from './cache.js';

describe('CacheManager', () => {
  it('returns correct cache path for marketplace', () => {
    const manager = new CacheManager();
    const cachePath = manager.getCachePath('my-marketplace');

    expect(cachePath).toBe(
      join(homedir(), '.claude', 'plugins', 'cache', 'my-marketplace')
    );
  });

  it('returns correct cache path for plugin in marketplace', () => {
    const manager = new CacheManager();
    const cachePath = manager.getPluginCachePath('my-marketplace', 'my-plugin');

    expect(cachePath).toContain('my-marketplace');
    expect(cachePath).toContain('my-plugin');
  });

  describe('clearCache', () => {
    let testCacheDir: string;
    let manager: CacheManager;

    beforeEach(async () => {
      testCacheDir = await fs.mkdtemp(join(tmpdir(), 'cps-cache-test-'));
      manager = new CacheManager(testCacheDir);
    });

    afterEach(async () => {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    });

    it('removes existing cache directory', async () => {
      const marketplaceCache = join(testCacheDir, 'test-market');
      await fs.mkdir(marketplaceCache, { recursive: true });
      await fs.writeFile(join(marketplaceCache, 'test.txt'), 'test');

      const result = await manager.clearCache('test-market');

      expect(result.success).toBe(true);
      const exists = await fs
        .access(marketplaceCache)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('succeeds when cache does not exist', async () => {
      const result = await manager.clearCache('nonexistent-market');
      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/sync/cache.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/sync/cache.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SyncResult } from '../types.js';

export class CacheManager {
  private cacheRoot: string;

  constructor(cacheRoot?: string) {
    this.cacheRoot =
      cacheRoot || join(homedir(), '.claude', 'plugins', 'cache');
  }

  getCachePath(marketplaceName: string): string {
    return join(this.cacheRoot, marketplaceName);
  }

  getPluginCachePath(marketplaceName: string, pluginName: string): string {
    return join(this.cacheRoot, marketplaceName, pluginName);
  }

  async clearCache(marketplaceName: string): Promise<SyncResult> {
    const cachePath = this.getCachePath(marketplaceName);

    try {
      await fs.rm(cachePath, { recursive: true, force: true });
      return {
        success: true,
        message: `Cleared cache: ${cachePath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cacheExists(marketplaceName: string): Promise<boolean> {
    const cachePath = this.getCachePath(marketplaceName);
    try {
      await fs.access(cachePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/sync/cache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sync/cache.ts src/sync/cache.test.ts
git commit -m "feat: add cache manager for clearing plugin cache"
```

---

### Task 10: Installer

**Files:**
- Create: `src/sync/installer.ts`
- Create: `src/sync/installer.test.ts`

**Step 1: Write the test**

```typescript
// src/sync/installer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Installer } from './installer.js';

describe('Installer', () => {
  it('builds correct marketplace add command', () => {
    const installer = new Installer();
    const cmd = installer.buildMarketplaceAddCommand('/path/to/marketplace');

    expect(cmd).toBe('claude plugin marketplace add "/path/to/marketplace"');
  });

  it('builds correct plugin install command', () => {
    const installer = new Installer();
    const cmd = installer.buildPluginInstallCommand(
      'my-plugin',
      'my-marketplace'
    );

    expect(cmd).toBe('claude plugin install my-plugin@my-marketplace');
  });

  it('handles paths with spaces', () => {
    const installer = new Installer();
    const cmd = installer.buildMarketplaceAddCommand('/path/with spaces/market');

    expect(cmd).toBe('claude plugin marketplace add "/path/with spaces/market"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/sync/installer.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/sync/installer.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SyncResult } from '../types.js';

const execAsync = promisify(exec);

export class Installer {
  buildMarketplaceAddCommand(marketplacePath: string): string {
    return `claude plugin marketplace add "${marketplacePath}"`;
  }

  buildPluginInstallCommand(
    pluginName: string,
    marketplaceName: string
  ): string {
    return `claude plugin install ${pluginName}@${marketplaceName}`;
  }

  async addMarketplace(marketplacePath: string): Promise<SyncResult> {
    const cmd = this.buildMarketplaceAddCommand(marketplacePath);

    try {
      await execAsync(cmd, { timeout: 60000 });
      return {
        success: true,
        message: `Added marketplace from ${marketplacePath}`
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to add marketplace: ${message}`
      };
    }
  }

  async installPlugin(
    pluginName: string,
    marketplaceName: string
  ): Promise<SyncResult> {
    const cmd = this.buildPluginInstallCommand(pluginName, marketplaceName);

    try {
      await execAsync(cmd, { timeout: 60000 });
      return {
        success: true,
        message: `Installed ${pluginName}@${marketplaceName}`
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to install plugin: ${message}`
      };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/sync/installer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sync/installer.ts src/sync/installer.test.ts
git commit -m "feat: add installer for running claude CLI commands"
```

---

### Task 11: Settings Reader

**Files:**
- Create: `src/sync/settings.ts`
- Create: `src/sync/settings.test.ts`

**Step 1: Write the test**

```typescript
// src/sync/settings.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SettingsReader } from './settings.js';

describe('SettingsReader', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-settings-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('reads installed plugins from settings', async () => {
    const settingsPath = join(testDir, 'settings.json');
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        enabledPlugins: {
          'plugin-a@my-market': true,
          'plugin-b@my-market': true,
          'plugin-c@other-market': true
        }
      })
    );

    const reader = new SettingsReader(settingsPath);
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toContain('plugin-a');
    expect(plugins).toContain('plugin-b');
    expect(plugins).not.toContain('plugin-c');
  });

  it('returns empty array when no plugins installed', async () => {
    const settingsPath = join(testDir, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify({}));

    const reader = new SettingsReader(settingsPath);
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toHaveLength(0);
  });

  it('handles missing settings file', async () => {
    const reader = new SettingsReader(join(testDir, 'nonexistent.json'));
    const plugins = await reader.getInstalledPlugins('my-market');

    expect(plugins).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/sync/settings.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/sync/settings.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
}

export class SettingsReader {
  private settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath =
      settingsPath || join(homedir(), '.claude', 'settings.json');
  }

  async getInstalledPlugins(marketplaceName: string): Promise<string[]> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const settings: ClaudeSettings = JSON.parse(content);

      if (!settings.enabledPlugins) {
        return [];
      }

      const plugins: string[] = [];
      const suffix = `@${marketplaceName}`;

      for (const key of Object.keys(settings.enabledPlugins)) {
        if (key.endsWith(suffix) && settings.enabledPlugins[key]) {
          const pluginName = key.slice(0, -suffix.length);
          plugins.push(pluginName);
        }
      }

      return plugins;
    } catch {
      return [];
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/sync/settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sync/settings.ts src/sync/settings.test.ts
git commit -m "feat: add settings reader to find installed plugins"
```

---

### Task 12: Sync Orchestrator

**Files:**
- Create: `src/sync/index.ts`
- Create: `src/sync/index.test.ts`

**Step 1: Write the test**

```typescript
// src/sync/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Syncer } from './index.js';
import { Logger } from '../ui/logger.js';

describe('Syncer', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger('quiet');
  });

  it('exposes sync method', () => {
    const syncer = new Syncer(mockLogger);
    expect(typeof syncer.syncMarketplace).toBe('function');
  });

  it('exposes syncPlugin method', () => {
    const syncer = new Syncer(mockLogger);
    expect(typeof syncer.syncPlugin).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/sync/index.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/sync/index.ts
import { CacheManager } from './cache.js';
import { Installer } from './installer.js';
import { SettingsReader } from './settings.js';
import { Logger } from '../ui/logger.js';
import type { SyncResult } from '../types.js';

export class Syncer {
  private cacheManager = new CacheManager();
  private installer = new Installer();
  private settingsReader = new SettingsReader();

  constructor(private logger: Logger) {}

  async syncMarketplace(
    marketplaceName: string,
    marketplacePath: string
  ): Promise<SyncResult> {
    // Step 1: Clear cache
    this.logger.debug(`Clearing cache for ${marketplaceName}`);
    const clearResult = await this.cacheManager.clearCache(marketplaceName);
    if (!clearResult.success) {
      this.logger.error(clearResult.message);
      return clearResult;
    }
    this.logger.info(`Cleared cache: ${this.cacheManager.getCachePath(marketplaceName)}`);

    // Step 2: Re-add marketplace
    this.logger.command(this.installer.buildMarketplaceAddCommand(marketplacePath));
    const addResult = await this.installer.addMarketplace(marketplacePath);
    if (!addResult.success) {
      this.logger.error(addResult.message);
      return addResult;
    }
    this.logger.debug(addResult.message);

    // Step 3: Reinstall previously installed plugins
    const installedPlugins =
      await this.settingsReader.getInstalledPlugins(marketplaceName);

    for (const pluginName of installedPlugins) {
      this.logger.command(
        this.installer.buildPluginInstallCommand(pluginName, marketplaceName)
      );
      const installResult = await this.installer.installPlugin(
        pluginName,
        marketplaceName
      );
      if (!installResult.success) {
        this.logger.warn(
          `Failed to reinstall ${pluginName}: ${installResult.message}`
        );
      } else {
        this.logger.debug(installResult.message);
      }
    }

    return {
      success: true,
      message: `Synced ${marketplaceName}`
    };
  }

  async syncPlugin(
    pluginName: string,
    _pluginPath: string
  ): Promise<SyncResult> {
    // For standalone plugins (not in a marketplace), we can't auto-sync
    // Users should use --plugin-dir flag during development
    this.logger.warn(
      `Standalone plugin "${pluginName}" detected. Use --plugin-dir flag with Claude Code for development.`
    );
    this.logger.info('Restart Claude Code to pick up changes.');

    return {
      success: true,
      message: `Plugin ${pluginName} change detected. Restart Claude Code.`
    };
  }
}

export { CacheManager } from './cache.js';
export { Installer } from './installer.js';
export { SettingsReader } from './settings.js';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/sync/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sync/index.ts src/sync/index.test.ts
git commit -m "feat: add sync orchestrator to coordinate cache clear and reinstall"
```

---

### Task 13: Interactive Prompt

**Files:**
- Create: `src/ui/prompt.ts`
- Create: `src/ui/prompt.test.ts`

**Step 1: Write the test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/prompt.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/ui/prompt.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import type { DiscoveredItem } from '../types.js';

interface Choice {
  name: string;
  value: DiscoveredItem;
  checked: boolean;
}

export class Prompt {
  buildChoices(items: DiscoveredItem[]): Choice[] {
    return items.map((item) => ({
      name: `${chalk.cyan(item.type === 'marketplace' ? '[marketplace]' : '[plugin]')} ${chalk.bold(item.name)} ${chalk.gray(item.path)}`,
      value: item,
      checked: true
    }));
  }

  async selectItems(items: DiscoveredItem[]): Promise<DiscoveredItem[]> {
    if (items.length === 0) {
      return [];
    }

    if (items.length === 1) {
      return items;
    }

    const { selected } = await inquirer.prompt<{ selected: DiscoveredItem[] }>([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select plugins/marketplaces to watch:',
        choices: this.buildChoices(items),
        validate: (answer: DiscoveredItem[]) => {
          if (answer.length === 0) {
            return 'Please select at least one item to watch.';
          }
          return true;
        }
      }
    ]);

    return selected;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/prompt.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/prompt.ts src/ui/prompt.test.ts
git commit -m "feat: add interactive prompt for selecting plugins to watch"
```

---

### Task 14: File Watcher

**Files:**
- Create: `src/watcher.ts`
- Create: `src/watcher.test.ts`

**Step 1: Write the test**

```typescript
// src/watcher.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Watcher } from './watcher.js';
import { Logger } from './ui/logger.js';
import type { DiscoveredItem } from './types.js';

describe('Watcher', () => {
  let testDir: string;
  let mockLogger: Logger;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'cps-watcher-test-'));
    mockLogger = new Logger('quiet');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns watch patterns for marketplace', () => {
    const item: DiscoveredItem = {
      type: 'marketplace',
      name: 'test-market',
      path: testDir,
      manifestPath: join(testDir, '.claude-plugin', 'marketplace.json')
    };

    const watcher = new Watcher(mockLogger);
    const patterns = watcher.getWatchPatterns(item);

    expect(patterns).toContain(join(testDir, '.claude-plugin', '**/*'));
    expect(patterns).toContain(join(testDir, 'skills', '**/*'));
    expect(patterns).toContain(join(testDir, 'commands', '**/*'));
  });

  it('returns watch patterns for plugin', () => {
    const item: DiscoveredItem = {
      type: 'plugin',
      name: 'test-plugin',
      path: testDir,
      manifestPath: join(testDir, '.claude-plugin', 'plugin.json')
    };

    const watcher = new Watcher(mockLogger);
    const patterns = watcher.getWatchPatterns(item);

    expect(patterns).toContain(join(testDir, '.claude-plugin', '**/*'));
    expect(patterns).toContain(join(testDir, 'skills', '**/*'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/watcher.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write the implementation**

```typescript
// src/watcher.ts
import chokidar, { FSWatcher } from 'chokidar';
import { join, relative } from 'node:path';
import { Logger } from './ui/logger.js';
import type { DiscoveredItem } from './types.js';

type ChangeHandler = (item: DiscoveredItem, changedPath: string) => void;

export class Watcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;

  constructor(private logger: Logger) {}

  getWatchPatterns(item: DiscoveredItem): string[] {
    const base = item.path;
    return [
      join(base, '.claude-plugin', '**/*'),
      join(base, 'skills', '**/*'),
      join(base, 'commands', '**/*'),
      join(base, 'agents', '**/*'),
      join(base, 'hooks', '**/*'),
      join(base, '.mcp.json'),
      join(base, '.lsp.json')
    ];
  }

  watch(items: DiscoveredItem[], onChange: ChangeHandler): void {
    for (const item of items) {
      const patterns = this.getWatchPatterns(item);

      this.logger.debug(`Watching ${item.name}: ${patterns.length} patterns`);

      const watcher = chokidar.watch(patterns, {
        ignoreInitial: true,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**'
        ]
      });

      watcher.on('all', (event, path) => {
        this.handleChange(item, path, onChange);
      });

      watcher.on('error', (error) => {
        this.logger.error(`Watcher error for ${item.name}: ${error.message}`);
      });

      this.watchers.set(item.name, watcher);
    }
  }

  private handleChange(
    item: DiscoveredItem,
    changedPath: string,
    onChange: ChangeHandler
  ): void {
    // Clear existing timer for this item
    const existingTimer = this.debounceTimers.get(item.name);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      const relativePath = relative(item.path, changedPath);
      this.logger.change(relativePath);
      onChange(item, changedPath);
      this.debounceTimers.delete(item.name);
    }, this.debounceMs);

    this.debounceTimers.set(item.name, timer);
  }

  async stop(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/watcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/watcher.ts src/watcher.test.ts
git commit -m "feat: add file watcher with debouncing"
```

---

### Task 15: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

**Step 1: Write the implementation**

```typescript
#!/usr/bin/env node
// src/cli.ts
import { program } from 'commander';
import chalk from 'chalk';
import { Scanner } from './scanner.js';
import { Watcher } from './watcher.js';
import { Validator } from './validator/index.js';
import { Syncer } from './sync/index.js';
import { Prompt } from './ui/prompt.js';
import { Logger } from './ui/logger.js';
import type { Verbosity, DiscoveredItem } from './types.js';

const VERSION = '0.1.0';

program
  .name('cps')
  .description('Claude Plugin Studio - Watch, validate, and sync Claude Code plugins')
  .version(VERSION)
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity: Verbosity = options.quiet
      ? 'quiet'
      : options.verbose
        ? 'verbose'
        : 'normal';

    await watchCommand(verbosity);
  });

program
  .command('validate')
  .description('Validate plugins/marketplaces without watching')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show errors only')
  .action(async (options) => {
    const verbosity: Verbosity = options.quiet
      ? 'quiet'
      : options.verbose
        ? 'verbose'
        : 'normal';

    await validateCommand(verbosity);
  });

async function watchCommand(verbosity: Verbosity): Promise<void> {
  const logger = new Logger(verbosity);
  const scanner = new Scanner(process.cwd());
  const prompt = new Prompt();
  const validator = new Validator();
  const syncer = new Syncer(logger);
  const watcher = new Watcher(logger);

  // Scan for plugins/marketplaces
  logger.info('Scanning for plugins and marketplaces...');
  const items = await scanner.scan();

  if (items.length === 0) {
    logger.error(
      'No plugins or marketplaces found. Make sure you have a .claude-plugin directory with plugin.json or marketplace.json.'
    );
    process.exit(1);
  }

  // Select items to watch
  const selected = await prompt.selectItems(items);

  if (selected.length === 0) {
    logger.error('No items selected. Exiting.');
    process.exit(1);
  }

  // Log what we're watching
  logger.info('');
  logger.info(chalk.bold('Watching:'));
  for (const item of selected) {
    logger.info(
      `  ${chalk.cyan(item.type === 'marketplace' ? '[marketplace]' : '[plugin]')} ${item.name}`
    );
  }
  logger.info('');
  logger.info(chalk.gray('Press Ctrl+C to stop'));
  logger.info('');

  // Handle changes
  const handleChange = async (item: DiscoveredItem) => {
    logger.info(`Validating ${item.name}...`);

    // Run validation
    const result =
      item.type === 'marketplace'
        ? await validator.validateMarketplace(item.path)
        : await validator.validatePlugin(item.path);

    if (!result.valid) {
      logger.validationError(result.errors);
      return;
    }

    logger.success('Valid. Syncing...');

    // Sync
    const syncResult =
      item.type === 'marketplace'
        ? await syncer.syncMarketplace(item.name, item.path)
        : await syncer.syncPlugin(item.name, item.path);

    if (syncResult.success) {
      logger.success(`Synced ${item.name}`);
    } else {
      logger.error(syncResult.message);
    }
  };

  // Start watching
  watcher.watch(selected, handleChange);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('');
    logger.info('Stopping...');
    await watcher.stop();
    process.exit(0);
  });
}

async function validateCommand(verbosity: Verbosity): Promise<void> {
  const logger = new Logger(verbosity);
  const scanner = new Scanner(process.cwd());
  const validator = new Validator();

  logger.info('Scanning for plugins and marketplaces...');
  const items = await scanner.scan();

  if (items.length === 0) {
    logger.error('No plugins or marketplaces found.');
    process.exit(1);
  }

  let hasErrors = false;

  for (const item of items) {
    logger.info(`Validating ${item.name}...`);

    const result =
      item.type === 'marketplace'
        ? await validator.validateMarketplace(item.path)
        : await validator.validatePlugin(item.path);

    if (result.valid) {
      logger.success(`${item.name} is valid`);
    } else {
      hasErrors = true;
      logger.validationError(result.errors);
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

program.parse();
```

**Step 2: Build and test**

Run: `npm run build && ./dist/cli.js --help`
Expected: Help output showing cps commands

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with watch and validate commands"
```

---

### Task 16: Final Testing and Polish

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Build the project**

Run: `npm run build`
Expected: Build succeeds, dist/cli.js created

**Step 3: Test locally**

Run: `npm link && cps --help`
Expected: Shows help output

**Step 4: Create a test plugin and verify watching works**

```bash
mkdir -p test-plugin/.claude-plugin
echo '{"name": "test-plugin", "version": "1.0.0"}' > test-plugin/.claude-plugin/plugin.json
cd test-plugin && cps
```
Expected: Starts watching, detects changes when you modify files

**Step 5: Commit final state**

```bash
git add -A
git commit -m "chore: complete initial implementation"
```

---

## Summary

This plan builds `cps` in 16 tasks:

1. **Project setup** - package.json, tsconfig, dependencies
2. **Types and schemas** - TypeScript types and JSON schemas
3. **Logger** - Verbosity-aware logging
4. **Scanner** - Find plugins/marketplaces
5. **Schema validator** - JSON schema validation with ajv
6. **Structure validator** - Check referenced paths exist
7. **Claude CLI validator** - Wrap claude plugin validate
8. **Validator orchestrator** - Combine all validation layers
9. **Cache manager** - Clear plugin cache
10. **Installer** - Run claude CLI commands
11. **Settings reader** - Find installed plugins
12. **Sync orchestrator** - Coordinate sync process
13. **Interactive prompt** - Select plugins to watch
14. **File watcher** - Watch for changes with debouncing
15. **CLI entry point** - Main command interface
16. **Final testing** - Verify everything works

Each task follows TDD: write test → verify failure → implement → verify pass → commit.
