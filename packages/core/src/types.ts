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

// Plugin interfaces (to be implemented)
export interface Plugin {
  name: string;
  // SDK Kit plugin interface TBD
}

export interface WorkflowsPlugin {
  list(options?: { workflow?: string }): Promise<any>;
}

export interface ContentPlugin {
  getByUrl(url: string): Promise<any>;
  scan(options?: { filter?: string; limit?: number }): AsyncGenerator<any[]>;
}

export interface SchemaPlugin {
  get(table: string): Promise<any>;
}
