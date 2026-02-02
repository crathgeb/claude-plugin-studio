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
