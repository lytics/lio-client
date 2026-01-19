import type { Plugin } from '@lytics/lio-client';

/**
 * Contentstack plugin for lio-client
 * 
 * @example
 * ```typescript
 * const lio = createLioClient({
 *   apiKey: process.env.LYTICS_API_KEY,
 *   plugins: [contentstackPlugin]
 * });
 * 
 * const enriched = await lio.contentstack.enrich(blogPost);
 * ```
 */
export const contentstackPlugin: Plugin = {
  name: 'contentstack',
  // TODO: Implement SDK Kit plugin interface
};
