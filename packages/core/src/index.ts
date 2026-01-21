/**
 * @lytics/lio-client
 *
 * TypeScript/JavaScript SDK for the Lytics API
 * Plugin-based architecture for any Lytics integration
 */

// Main client
export { createLioClient } from './client';
export type {
  ContentEntityResponse,
  ContentScanOptions,
} from './plugins/content';
export { contentPlugin } from './plugins/content';
export type { SchemaResponse } from './plugins/schema';
export { schemaPlugin } from './plugins/schema';
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
  ContentEntity,
  ContentPlugin,
  LioClient,
  LioClientConfig,
  Schema,
  SchemaField,
  SchemaPlugin,
  WorkflowJob,
  WorkflowsPlugin,
} from './types';
