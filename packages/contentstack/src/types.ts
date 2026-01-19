/**
 * Types for Contentstack integration
 */

export interface ContentstackEntry {
  url: string;
  uid: string;
  [key: string]: any;
}

export interface EnrichedContentstackEntry extends ContentstackEntry {
  _lytics: {
    topics: Record<string, number>;
    hashedurl?: string;
    segments?: string[];
  };
}

export interface ContentstackPlugin {
  /** Check Contentstack workflow sync status */
  getSyncStatus(): Promise<any>;
  
  /** Enrich a single entry with Lytics data */
  enrich(entry: ContentstackEntry): Promise<EnrichedContentstackEntry>;
  
  /** Enrich multiple entries (batch) */
  enrichMany(entries: ContentstackEntry[]): Promise<EnrichedContentstackEntry[]>;
}
