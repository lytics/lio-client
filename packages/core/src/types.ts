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

  /** Segments API - list and get audience segments */
  segments: SegmentsPlugin;

  /** AI API - LLM-ready context generation */
  ai: AiPlugin;

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
  scanSegment(
    segmentId: string,
    options?: {
      limit?: number;
      fields?: string[];
    }
  ): AsyncGenerator<ContentEntity[], void, undefined>;
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

export interface Segment {
  id: string;
  slug_name: string;
  name: string;
  description?: string;
  kind: string;
  table: string;
  size?: number;
  tags?: string[] | null;
  groups?: string[] | null;
  fields?: string[] | null;
  includes?: string[] | null;
  identities?: string[] | null;
  segment_ql?: string;
  ast?: Record<string, unknown>;
  invalid?: boolean;
  invalid_reason?: string;
  deleted?: boolean;
  is_public?: boolean;
  public_name?: string;
  category?: string;
  save_hist?: boolean;
  field_changes_fields?: string[] | null;
  emit_trigger?: boolean;
  schedule_exit?: boolean;
  expires_at?: string | null;
  datemath_calc?: boolean;
  forward_datemath?: boolean;
  author_id?: string;
  aid?: number;
  account_id?: string;
  eval_segml?: boolean;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface SegmentListOptions {
  /** Entity table filter (default: "user", use "all" for all tables) */
  table?: string;
  /** Validity filter: "true" | "false" | "all" (default: "all") */
  valid?: string;
  /** Kind filter: "segment" | "goal" | "aspect" | "conversion" | "managed" | "all" */
  kind?: string;
  /** Exclude predefined segments (default: false) */
  filterPredefined?: boolean;
}

export interface SegmentGetOptions {
  /** Include cached segment sizes (default: false) */
  sizes?: boolean;
}

export interface SegmentsPlugin {
  list(options?: SegmentListOptions): Promise<Segment[]>;
  get(slugOrId: string, options?: SegmentGetOptions): Promise<Segment>;
}

export interface AiPlugin {
  segmentPrompt(segmentId: string): Promise<string>;
}
