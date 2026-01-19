/**
 * Core types for @lytics/lio-client
 */

export interface LioClientConfig {
  /** Lytics API key (get from account settings) */
  apiKey: string;
  
  /** Base URL for Lytics API (default: https://api.lytics.io) */
  baseUrl?: string;
  
  /** Optional plugins to load (e.g., Contentstack integration) */
  plugins?: Plugin[];
}

export interface LioClient {
  /** Workflows API - monitor sync status */
  workflows: WorkflowsPlugin;
  
  /** Content API - query enriched content */
  content: ContentPlugin;
  
  /** Schema API - get table schemas */
  schema: SchemaPlugin;
}

// Plugin interfaces
export interface Plugin {
  name: string;
  // SDK Kit plugin interface TBD
}

export interface WorkflowJob {
  id: string;
  name: string;
  workflow: string;
  status: 'sleeping' | 'running' | 'completed' | 'failed';
  updated: string;
  config: Record<string, unknown>;
}

export interface WorkflowsPlugin {
  list(options?: { workflow?: string }): Promise<WorkflowJob[]>;
}

export interface ContentEntity {
  url: string;
  hashedurl?: string[];
  lytics?: Record<string, number>;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  body?: string | null;
  created?: string | null;
  _created?: string;
  _modified?: string;
  _segments?: string[];
  contentstack_uid?: string | null;
  [key: string]: unknown;
}

export interface ContentPlugin {
  getByUrl(url: string): Promise<ContentEntity>;
  scan(options?: { filter?: string; limit?: number }): AsyncGenerator<ContentEntity[]>;
}

export interface SchemaField {
  id: string;
  type: string;
  description?: string;
}

export interface Schema {
  name: string;
  fields: SchemaField[];
}

export interface SchemaPlugin {
  get(table: string): Promise<Schema>;
}
