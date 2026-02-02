# Claude Plugin Studio

Development tool for Claude Code plugins. Watch, validate, and auto-sync your plugins during development.

## Features

- **Watch Mode** - Automatically validates and syncs plugins when files change
- **Validation** - Three-layer validation (JSON schema, structure, Claude CLI)
- **Scaffolding** - Interactively create new marketplaces and plugins
- **Auto-sync** - Clears cache and reinstalls plugins after successful validation

## Installation

```bash
npm install -g claude-plugin-studio
```

## Usage

### Watch for Changes

Start watching your plugins directory for changes. Validates and syncs automatically on each save.

```bash
cps
# or explicitly
cps watch
```

### Validate Once

Run validation without watching:

```bash
cps validate
```

### Create a New Plugin or Marketplace

Interactively scaffold a new marketplace or plugin:

```bash
cps create
```

### Options

All commands support verbosity flags:

```bash
cps --verbose    # Detailed output
cps --quiet      # Errors only
```

## How It Works

### Validation Layers

Validation runs in order, stopping on first failure:

1. **Schema** - Validates `plugin.json` / `marketplace.json` against JSON schemas
2. **Structure** - Checks that referenced directories and files exist
3. **Claude CLI** - Runs `claude plugin validate` for final verification

### Sync Process

After successful validation:

1. Clears the marketplace cache at `~/.claude/plugins/cache/{marketplace-name}/`
2. Runs `claude plugin marketplace add <path>`
3. Reinstalls previously installed plugins from settings

## Plugin Structure

Plugins live in directories with a `.claude-plugin/` folder:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── commands/
├── agents/
└── hooks/
```

### plugin.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin"
}
```

## Marketplace Structure

Marketplaces catalog multiple plugins:

```
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── plugin-a/
│   └── .claude-plugin/
│       └── plugin.json
└── plugin-b/
    └── .claude-plugin/
        └── plugin.json
```

### marketplace.json

```json
{
  "name": "my-marketplace",
  "version": "1.0.0",
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "plugins": [
    { "name": "plugin-a", "source": "./plugin-a" },
    { "name": "plugin-b", "source": "./plugin-b" }
  ]
}
```

## Requirements

- Node.js 18+
- Claude Code CLI installed and available in PATH

## License

MIT
