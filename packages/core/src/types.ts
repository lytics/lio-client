/**
 * Core types for @lytics/lio-client
 */

import type { PluginFunction } from '@lytics/sdk-kit';

export interface LioClientConfig {
  /** Lytics API key (get from account settings) */
  apiKey: string;

  /** Base URL for Lytics API (default: https://api.lytics.io) */
  baseUrl?: string;

  /** Lytics account ID (required for jobs and providers endpoints) */
  accountId?: string;

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

  /** Jobs API - list integration jobs */
  jobs: JobsPlugin;

  /** Providers API - list integration providers */
  providers: ProvidersPlugin;

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
  status: 'sleeping' | 'running' | 'completed' | 'failed' | 'paused';
  updated: string;
  config: Record<string, unknown>;
  account_id?: string;
  workflow_id?: string;
  description?: string;
  created?: string;
  user_id?: string;
  api_token_auth_id?: string;
  auth_ids?: string[];
  deleted?: boolean;
  expires_at?: string | null;
  drop_events_during_quiet_window?: boolean;
  meta?: unknown | null;
}

export interface WorkflowsPlugin {
  list(options?: { workflow?: string }): Promise<WorkflowJob[]>;
}

export interface ContentEntity {
  url: string;
  hashedurl?: string[];
  /** @deprecated Use `global` for display-name scores or `freebase` for internal-name scores */
  lytics?: Record<string, number>;
  /** Topic scores keyed by display name (e.g., "Artificial Intelligence": 0.95) */
  global?: Record<string, number>;
  /** Topic scores keyed by internal/freebase name */
  freebase?: Record<string, number>;
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

export interface ContentEnrichResult {
  /** The input text or URL that was enriched */
  input: string;
  /** Topic scores keyed by display name */
  topics: Record<string, number>;
  /** Inferred topic scores from topic relationships */
  inferred_topics: Record<string, number>;
}

export interface ContentAlignOptions {
  /** Similarity method: "embed" (default), "jaccard", or "cosine" */
  method?: 'embed' | 'jaccard' | 'cosine';
  /** Max segments to return (default: 10) */
  limit?: number;
}

export interface ContentAlignment {
  segment_id: string;
  segment_name: string;
  segment_size: number;
  alignment: number;
  segment_topics: Record<string, number>;
}

export interface OpportunityDimension {
  label: string;
  value: number;
  subject: string;
}

export interface OpportunityTopic {
  topic: string;
  dimensions: OpportunityDimension[];
  segments: string[];
  context_layer: string;
}

export interface ContentOpportunityOptions {
  /** ISO 8601 date, defaults to latest */
  date?: string;
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
  enrich(input: { text?: string; url?: string }): Promise<ContentEnrichResult>;
  align(topics: Record<string, number>, options?: ContentAlignOptions): Promise<ContentAlignment[]>;
  /** Fetch content opportunity topics */
  opportunity(options?: ContentOpportunityOptions): Promise<OpportunityTopic[]>;
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
  /** Include cached segment sizes (requires server commit d168baa) */
  sizes?: boolean;
}

export interface SegmentGetOptions {
  /** Include cached segment sizes (default: false) */
  sizes?: boolean;
}

export interface SegmentSizesOptions {
  /** Entity table filter (default: "user") */
  table?: string;
  /** Filter to specific segment IDs */
  ids?: string[];
}

export interface SegmentSize {
  id: string;
  name: string;
  slug_name: string;
  size: number;
  timestamp: string;
}

export interface SegmentGroup {
  id: string;
  aid: number;
  account_id: string;
  created: string;
  updated: string;
  author: string;
  name: string;
  description: string;
  segment_ids: string[];
}

export interface SegmentScanOptions {
  limit?: number;
  fields?: string[];
  /** Entity table: "user" (default), "content", "campaign", etc. */
  table?: string;
  sortfield?: string;
  sortorder?: 'asc' | 'desc';
}

export interface SegmentsPlugin {
  list(options?: SegmentListOptions): Promise<Segment[]>;
  get(slugOrId: string, options?: SegmentGetOptions): Promise<Segment>;
  /** Fetch pre-computed segment sizes (v1 bulk endpoint). */
  sizes(options?: SegmentSizesOptions): Promise<SegmentSize[]>;
  /** Fetch segment groups */
  groups(): Promise<SegmentGroup[]>;
  /** Scan a segment's entities (generic, supports any table) */
  scan(segmentId: string, options?: SegmentScanOptions): Promise<Record<string, unknown>[]>;
}

export interface AiPlugin {
  segmentPrompt(segmentId: string): Promise<string>;
}

export interface Job {
  id: string;
  account_id: string;
  name: string;
  description: string;
  workflow: string;
  workflow_id: string;
  status: 'running' | 'sleeping' | 'paused' | 'completed' | 'failed';
  created: string;
  updated: string;
  user_id: string;
  api_token_auth_id?: string;
  auth_ids: string[];
  config: Record<string, unknown>;
  deleted: boolean;
  expires_at: string | null;
  drop_events_during_quiet_window?: boolean;
  meta?: unknown | null;
}

export interface JobsPlugin {
  list(options?: JobListOptions): Promise<Job[]>;
}

export interface JobListOptions {
  /** Show completed jobs */
  showCompleted?: boolean;
  /** Show job state info */
  showState?: boolean;
  /** Show all jobs including completed */
  showAll?: boolean;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  namespace: string;
  description: string;
  categories: string[];
  hidden: boolean;
  custom: boolean;
  connected: boolean;
  documentation: string;
  no_auth: boolean;
  auth_description: string;
  auths: ProviderAuth[];
  created: string;
  updated: string;
}

export interface ProviderAuth {
  name: string;
  display_name: string;
  type: string;
  v2_type: string;
  hidden: boolean;
  auth_description?: string;
  config: ProviderAuthConfig[];
}

export interface ProviderAuthConfig {
  control?: string;
  type: string;
  label: string;
  name: string;
  sort_order?: number;
  optional?: boolean;
  description?: string;
  suffix?: string;
}

export interface ProvidersPlugin {
  list(): Promise<Provider[]>;
}
