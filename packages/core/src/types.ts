/**
 * Core types for @lytics/lio-client
 */

import type { PluginFunction } from '@lytics/sdk-kit';

export interface LioClientConfig {
  /** Lytics API key (get from account settings) */
  apiKey: string;

  /** Base URL for Lytics API (default: https://api.lytics.io) */
  baseUrl?: string;

  /** Optional plugins to load (e.g., Contentstack integration) */
  plugins?: PluginFunction[];
}

export interface LioClient {
  /** Initialize the client (required before using any methods) */
  init(): Promise<void>;

  /** Workflows API - monitor sync status */
  workflows: WorkflowsPlugin;

  /** Content API - query enriched content */
  content: ContentPlugin;

  /** Schema API - get table schemas */
  schema: SchemaPlugin;

  /** Event system from SDK Kit */
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;

  /** Check if client is initialized */
  isReady(): boolean;

  /** Destroy the client and cleanup */
  destroy(): Promise<void>;
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
  scan(options?: {
    filter?: string;
    limit?: number;
    fields?: string[];
  }): AsyncGenerator<ContentEntity[], void, undefined>;
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
  clearCache(table?: string): void;
}
