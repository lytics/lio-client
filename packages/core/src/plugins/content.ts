/**
 * Content Plugin
 *
 * Provides access to Lytics content enrichment data:
 * - Get content entity by URL
 * - Scan content table (bulk queries)
 * - Topics extraction from entity.lytics field
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { ContentEntity, ContentPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export interface ContentEntityResponse {
  entity: ContentEntity;
}

export interface ContentScanOptions {
  /** LQL filter (e.g., 'EXISTS hashedurl') */
  filter?: string;
  /** Maximum results per page (default: 100) */
  limit?: number;
  /** Fields to return (default: all) */
  fields?: string[];
}

/**
 * Normalize URL for content queries
 * Lytics strips protocols, so we match that behavior
 */
function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/**
 * Content plugin
 *
 * @example
 * ```typescript
 * // Get content by URL
 * const content = await lio.content.getByUrl('example.com/blog/post');
 * console.log(content.lytics); // Topics: { "AI": 1, "Tech": 0.8 }
 *
 * // Scan all content
 * const allContent = [];
 * for await (const batch of lio.content.scan()) {
 *   allContent.push(...batch);
 * }
 * ```
 */
export const contentPlugin: PluginFunction = (plugin, instance) => {
  plugin.ns('content');

  // Expose API
  plugin.expose({
    content: {
      /**
       * Get content entity by URL
       *
       * @param url - Content URL (protocol optional, will be normalized)
       * @returns Content entity with topics in the `lytics` field
       *
       * @example
       * ```typescript
       * const content = await lio.content.getByUrl('example.com/blog/post');
       * console.log(content.url);           // 'example.com/blog/post'
       * console.log(content.title);         // 'My Blog Post'
       * console.log(content.lytics);        // { "AI": 1, "Machine Learning": 0.8 }
       * console.log(content._created);      // '2024-01-20T12:00:00Z'
       * ```
       */
      async getByUrl(url: string): Promise<ContentEntity> {
        if (!url) {
          throw new Error('URL is required');
        }

        const normalizedUrl = normalizeUrl(url);

        plugin.emit('content:get-by-url', { url: normalizedUrl });

        // Get transport
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        // Query by URL
        const response = await transport.get<ContentEntityResponse>('/v2/content/entity', {
          url: normalizedUrl,
        });

        plugin.emit('content:got-by-url', { url: normalizedUrl, found: !!response.entity });

        return response.entity;
      },

      /**
       * Scan content table with optional filtering
       *
       * Returns an async generator that yields batches of content entities.
       * Uses `/api/segment/scan` with ad-hoc SegmentQL queries.
       *
       * @param options - Scan options (filter, limit, fields)
       * @returns Async generator yielding content entity batches
       *
       * @example
       * ```typescript
       * // Scan all content
       * for await (const batch of lio.content.scan()) {
       *   console.log(`Got ${batch.length} entities`);
       *   for (const entity of batch) {
       *     console.log(entity.url, entity.lytics);
       *   }
       * }
       *
       * // Scan with filter
       * for await (const batch of lio.content.scan({
       *   filter: 'EXISTS hashedurl',
       *   limit: 50
       * })) {
       *   // Process batch
       * }
       * ```
       */
      async *scan(options?: ContentScanOptions): AsyncGenerator<ContentEntity[], void, undefined> {
        const limit = options?.limit || 100;
        const filter = options?.filter || 'EXISTS hashedurl'; // Default: all content with URLs

        plugin.emit('content:scan-start', { filter, limit });

        // Get transport
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        let offset = 0;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
          // Build SegmentQL query
          // Format: FILTER <condition> FROM <table> LIMIT <n> OFFSET <n>
          const query = `FILTER ${filter} FROM content LIMIT ${limit} OFFSET ${offset}`;

          plugin.emit('content:scan-batch', { offset, limit });

          try {
            // Use /api/segment/scan with ad-hoc query
            const response = await transport.post<{ data: ContentEntity[] }>('/api/segment/scan', {
              query,
            });

            const entities = response.data || [];

            if (entities.length === 0) {
              hasMore = false;
              break;
            }

            totalFetched += entities.length;

            plugin.emit('content:scan-batch-received', {
              count: entities.length,
              offset,
              total: totalFetched,
            });

            yield entities;

            // Check if we got fewer results than requested (last page)
            if (entities.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } catch (error: any) {
            plugin.emit('content:scan-error', { error: error.message, offset });
            throw new Error(`Content scan failed at offset ${offset}: ${error.message}`);
          }
        }

        plugin.emit('content:scan-complete', { total: totalFetched });
      },
    } as ContentPlugin,
  });
};
