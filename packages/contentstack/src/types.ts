/**
 * Types for Contentstack integration
 */

export interface ContentstackEntry {
  url: string;
  uid: string;
  [key: string]: unknown;
}

export interface LyticsEnrichment {
  topics: Record<string, number>;
  hashedurl?: string;
  segments?: string[];
}

export interface EnrichedContentstackEntry extends ContentstackEntry {
  _lytics: LyticsEnrichment;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  workflow: string;
  status: 'sleeping' | 'running' | 'completed' | 'failed';
  updated: string;
  config: Record<string, unknown>;
}

export interface ContentstackPlugin {
  /** Check Contentstack workflow sync status */
  getSyncStatus(): Promise<WorkflowStatus>;
  
  /** Enrich a single entry with Lytics data */
  enrich(entry: ContentstackEntry): Promise<EnrichedContentstackEntry>;
  
  /** Enrich multiple entries (batch) */
  enrichMany(entries: ContentstackEntry[]): Promise<EnrichedContentstackEntry[]>;
}
