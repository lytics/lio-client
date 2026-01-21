/**
 * @lytics/lio-client-contentstack
 *
 * Contentstack CMS integration for Lytics lio-client
 * Enriches Contentstack entries with Lytics topics and analytics
 */

export { contentstackPlugin } from './plugin';
export type {
  ContentAnalytics,
  ContentstackEntry,
  ContentstackPlugin,
  EnrichedContentstackEntry,
  LyticsEnrichment,
  SyncStatus,
} from './types';
