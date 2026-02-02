# Claude Plugin Studio Design

## Overview

`cps` (claude-plugin-studio) is a CLI tool that watches Claude Code plugins and marketplaces during development, validates changes, and auto-syncs them by clearing cache and reinstalling.

## Problem

When developing Claude Code plugins, developers must manually:
1. Make changes to plugin files
2. Delete the cache folder (`~/.claude/plugins/cache/{marketplace}/`)
3. Re-run `claude plugin marketplace add` to reinstall
4. Repeat for every change

This is tedious and error-prone.

## Solution

A file watcher that automates the validate-and-sync cycle during plugin development.

## CLI Interface

**Package:** `claude-plugin-studio` (npm global install)
**Command:** `cps`

```bash
cps              # Start watching (default verbosity)
cps --verbose    # Detailed output
cps --quiet      # Errors only
cps validate     # One-time validation, no watch
cps --help       # Help
```

## Startup Flow

1. Scan current directory recursively for `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
2. If none found → exit with helpful message
3. If one found → auto-select and start watching
4. If multiple found → show interactive checkbox list to select which to monitor
5. Begin file watching on selected plugins/marketplaces

## File Watching

### Watched Paths

For each plugin/marketplace:
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `skills/**/*`
- `commands/**/*`
- `agents/**/*`
- `hooks/**/*`
- `.mcp.json`
- `.lsp.json`

### Debouncing

Wait 300ms after last change before triggering sync (handles rapid saves/batch changes).

### Output (default verbosity)

```
[12:34:56] Change detected: skills/review/SKILL.md
[12:34:56] Validating my-marketplace...
[12:34:57] ✓ Valid. Syncing...
[12:34:58] ✓ Synced my-marketplace
```

## Validation

Three validation layers, run in order (stop on first failure):

### Layer 1: JSON Schema Validation

- Validate `plugin.json` against plugin manifest schema
- Validate `marketplace.json` against marketplace schema
- Use `ajv` library for JSON schema validation

### Layer 2: Structure Validation

- Check referenced directories exist (`skills/`, `commands/`, `agents/`, `hooks/`)
- Verify files referenced in manifest actually exist
- For marketplaces: validate each plugin entry's `source` path exists (for relative paths)

### Layer 3: Claude CLI Validator

- Run `claude plugin validate <path>` via child process
- Parse stdout/stderr for errors

### Error Output

```
[12:34:56] Change detected: plugin.json
[12:34:56] Validating my-plugin...
[12:34:56] ✗ Validation failed:
           - plugin.json: "name" is required
           - Directory "skills/review" referenced but does not exist
[12:34:56] ⏸ Sync blocked until errors are fixed
```

## Sync Process

When validation passes:

### Step 1: Identify Cache Location

- Cache lives at `~/.claude/plugins/cache/{marketplace-name}/`
- For plugins: `~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/{version}/`

### Step 2: Delete Cache

- Remove the entire marketplace cache folder
- Use `fs.rm(path, { recursive: true, force: true })`

### Step 3: Reinstall via CLI

- For marketplaces: `claude plugin marketplace add <watched-path>`
- For standalone plugins being developed with `--plugin-dir`: notify user to restart Claude

### Step 4: Reinstall Plugins

- After marketplace add, reinstall any plugins that were previously installed
- Read which plugins were installed from `~/.claude/settings.json`

### Output

```
[12:34:57] ✓ Valid. Syncing...
[12:34:57] Clearing cache: ~/.claude/plugins/cache/my-marketplace/
[12:34:58] Running: claude plugin marketplace add ./my-marketplace
[12:34:59] Running: claude plugin install review-plugin@my-marketplace
[12:35:00] ✓ Synced my-marketplace
```

## Project Structure

```
claude-plugin-studio/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts                 # Entry point, argument parsing
│   ├── scanner.ts             # Finds plugins/marketplaces in directory
│   ├── watcher.ts             # File watching with chokidar
│   ├── validator/
│   │   ├── index.ts           # Orchestrates all validation layers
│   │   ├── schema.ts          # JSON schema validation (ajv)
│   │   ├── structure.ts       # Directory/file existence checks
│   │   └── claude-cli.ts      # Wraps `claude plugin validate`
│   ├── sync/
│   │   ├── index.ts           # Orchestrates sync process
│   │   ├── cache.ts           # Cache detection and deletion
│   │   └── installer.ts       # Runs claude CLI commands
│   ├── ui/
│   │   ├── prompt.ts          # Interactive plugin selection
│   │   └── logger.ts          # Verbosity-aware logging
│   ├── schemas/
│   │   ├── plugin.schema.json
│   │   └── marketplace.schema.json
│   └── types.ts               # TypeScript interfaces
├── dist/                      # Compiled output
└── README.md
```

## Dependencies

- `chokidar` - file watching
- `ajv` - JSON schema validation
- `inquirer` - interactive prompts
- `chalk` - colored terminal output
- `commander` - CLI argument parsing

## Dev Dependencies

- `typescript`
- `@types/node`
- `tsup` or `esbuild` - bundling

## Future Considerations (not in v1)

- Config file for custom watch paths
- Multiple simultaneous Claude instances
- WebSocket-based hot reload if Claude ever supports it
- Plugin scaffolding commands (`cps init`)
