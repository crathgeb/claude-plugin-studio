# Claude Plugin Studio

Development tool for Claude Code plugins - watch, validate, and auto-sync during development.

## Bash Commands

- `npm run build` - Build the project with tsup (outputs to dist/)
- `npm run dev` - Build in watch mode for development
- `npm run test` - Run tests in watch mode with Vitest
- `npm run test:run` - Run tests once
- `npm run typecheck` - Type check without emitting
- `npm link` - Link globally to use `cps` command

### CLI Commands

- `cps` - Start watching plugins/marketplaces (default action)
- `cps watch` - Explicit watch command
- `cps validate` - One-time validation without watching
- `cps create` - Interactively create a new marketplace or plugin
- `cps --verbose` or `-v` - Run with detailed output
- `cps --quiet` or `-q` - Run with errors only

## Code Style

- TypeScript with strict mode
- ESM modules (`"type": "module"` in package.json)
- Use `.js` extension in imports (e.g., `import { Scanner } from './scanner.js'`)
- Interfaces over types for object shapes
- Explicit return types on exported functions
- Tests colocated with source files (`*.test.ts`)

## Architecture

```
src/
├── cli.ts              # Entry point, commander setup
├── types.ts            # Shared TypeScript interfaces
├── scanner.ts          # Finds plugins/marketplaces recursively
├── watcher.ts          # File watching with chokidar (300ms debounce)
├── scaffolder.ts       # Creates plugin/marketplace scaffolding
├── commands/           # CLI command implementations
│   ├── watch.ts        # Watch command logic
│   └── create.ts       # Create command logic
├── templates/          # Template generators
│   └── index.ts        # Generates manifests and sample skills
├── schemas/            # JSON schemas for validation
│   ├── plugin.schema.json
│   └── marketplace.schema.json
├── validator/          # Three-layer validation
│   ├── index.ts        # Orchestrator (stops on first failure)
│   ├── schema.ts       # JSON schema validation with ajv
│   ├── structure.ts    # Checks referenced paths exist
│   └── claude-cli.ts   # Wraps `claude plugin validate`
├── sync/               # Cache clearing and reinstallation
│   ├── index.ts        # Orchestrator
│   ├── cache.ts        # Manages ~/.claude/plugins/cache/
│   ├── installer.ts    # Runs claude CLI commands
│   └── settings.ts     # Reads ~/.claude/settings.json
└── ui/
    ├── logger.ts       # Verbosity-aware logging with chalk
    └── prompt.ts       # Interactive selection with inquirer
```

## Key Concepts

**DiscoveredItem**: Plugin or marketplace found during scan
- `type`: 'plugin' | 'marketplace'
- `path`: Directory containing .claude-plugin/
- `manifestPath`: Full path to plugin.json or marketplace.json

**Validation layers** (run in order, stop on first failure):
1. Schema - JSON schema validation with ajv
2. Structure - Referenced directories/files exist
3. Claude CLI - `claude plugin validate <path>`

**Sync process**:
1. Clear cache at `~/.claude/plugins/cache/{marketplace}/`
2. Run `claude plugin marketplace add <path>`
3. Reinstall previously installed plugins from settings.json

## Testing

- Framework: Vitest
- Pattern: Tests next to source files (`scanner.test.ts` beside `scanner.ts`)
- Run single file: `npx vitest run src/scanner.test.ts`
- Most tests use mocking (vi.mock) to isolate from filesystem/CLI

## Important Files

- `src/types.ts` - All shared interfaces (PluginManifest, ValidationResult, etc.)
- `src/schemas/*.json` - JSON schemas defining valid plugin/marketplace structure
- `src/cli.ts` - Main entry point, defines all CLI commands
- `src/scaffolder.ts` - Creates plugin/marketplace directory structures
- `src/templates/index.ts` - Template content for manifests and sample skills

## Claude Code Plugin Structure

Plugins have `.claude-plugin/plugin.json` with optional directories:
- `skills/` - Skill definitions (SKILL.md files)
- `commands/` - Slash commands
- `agents/` - Agent definitions
- `hooks/` - Lifecycle hooks

Marketplaces have `.claude-plugin/marketplace.json` cataloging multiple plugins.
