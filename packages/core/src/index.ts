/**
 * @lytics/lio-client
 * 
 * TypeScript/JavaScript SDK for the Lytics API
 * Plugin-based architecture for any Lytics integration
 */

export { createLioClient } from './client';
export type { LioClient, LioClientConfig } from './types';

// Re-export plugin types for consumers
export type { Plugin } from './types';
