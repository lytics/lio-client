/**
 * Types for Contentstack integration
 */

/**
 * Contentstack entry with standard fields
 *
 * The plugin uses hybrid matching:
 * - url/href: Fast lookup (primary strategy)
 * - uid: Fallback for URL changes (e.g., slug updates)
 */
export interface ContentstackEntry {
  url?: string;
  href?: string;
  uid?: string; // Contentstack entry UID (stable across URL changes)
  [key: string]: unknown;
}

export interface LyticsEnrichment {
  topics?: Record<string, number>;
  hashedurl?: string;
  segments?: string[];
  url?: string;
}

export interface EnrichedContentstackEntry extends ContentstackEntry {
  _lytics?: LyticsEnrichment;
}

export interface SyncStatus {
  status: 'not_configured' | 'sleeping' | 'running' | 'completed' | 'failed';
  lastSync: string | null;
  entriesSynced: number;
  contentTypes: string[];
  workflowId?: string;
}

export interface ContentAnalytics {
  totalEntries: number;
  topTopics: Array<{ topic: string; count: number }>;
  contentTypes: Record<string, number>;
}

export interface ContentstackPlugin {
  /** Check Contentstack workflow sync status */
  getSyncStatus(): Promise<SyncStatus>;

  /**
   * Get Lytics enrichment data for a Contentstack entry or URL
   *
   * Uses hybrid matching strategy:
   * 1. Try URL first (fast, indexed)
   * 2. Fallback to UID scan (handles URL changes)
   */
  getEnrichmentData(entryOrUrl: string | ContentstackEntry): Promise<any>;

  /** Scan all Contentstack content in Lytics */
  scanContent(options?: any): AsyncGenerator<any>;

  /** Get content analytics for Contentstack entries */
  getAnalytics(): Promise<ContentAnalytics>;

  /** Enrich a single entry with Lytics data */
  enrich<T extends Record<string, any>>(entry: T): Promise<T & { _lytics?: LyticsEnrichment }>;

  /** Enrich multiple entries (batch) */
  enrichMany<T extends Record<string, any>>(
    entries: T[]
  ): Promise<Array<T & { _lytics?: LyticsEnrichment }>>;
}
