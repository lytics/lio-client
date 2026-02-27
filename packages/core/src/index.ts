/**
 * @lytics/lio-client
 *
 * TypeScript/JavaScript SDK for the Lytics API
 * Plugin-based architecture for any Lytics integration
 */

// Main client
export { createLioClient } from './client';
export { aiPlugin } from './plugins/ai';
export type {
  ContentEntityResponse,
  ContentScanOptions,
} from './plugins/content';
export { contentPlugin } from './plugins/content';
export { jobsPlugin } from './plugins/jobs';
export { providersPlugin } from './plugins/providers';
export type { SchemaResponse } from './plugins/schema';
export { schemaPlugin } from './plugins/schema';
export { segmentsPlugin } from './plugins/segments';
// Plugin types
export type {
  ApiError,
  ApiResponse,
  LyticsTransportConfig,
  LyticsTransportPlugin,
} from './plugins/transport';
// Plugins
export { lyticsTransportPlugin } from './plugins/transport';

export type {
  WorkflowJobResponse,
  WorkflowListOptions,
  WorkflowLogsResponse,
} from './plugins/workflows';
export { workflowsPlugin } from './plugins/workflows';
// Types
export type {
  AiPlugin,
  ContentAlignment,
  ContentAlignOptions,
  ContentEnrichResult,
  ContentEntity,
  ContentPlugin,
  Job,
  JobListOptions,
  JobsPlugin,
  LioClient,
  LioClientConfig,
  Provider,
  ProviderAuth,
  ProviderAuthConfig,
  ProvidersPlugin,
  Schema,
  SchemaField,
  SchemaPlugin,
  Segment,
  SegmentGetOptions,
  SegmentListOptions,
  SegmentSize,
  SegmentSizesOptions,
  SegmentsPlugin,
  WorkflowJob,
  WorkflowsPlugin,
} from './types';
