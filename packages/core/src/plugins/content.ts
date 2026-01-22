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
  /** SegmentQL filter (e.g., 'EXISTS url') */
  filter?: string;
  /** Maximum results per page (default: 100) */
  limit?: number;
  /** Fields to return (default: all) */
  fields?: string[];
}

export interface SavedSegmentScanOptions {
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
       * Uses `/api/segment/scan` with ad-hoc SegmentQL queries sent as plain text.
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
       * // Scan with custom filter
       * for await (const batch of lio.content.scan({
       *   filter: 'EXISTS title',
       *   limit: 50
       * })) {
       *   // Process batch
       * }
       * ```
       */
      async *scan(options?: ContentScanOptions): AsyncGenerator<ContentEntity[], void, undefined> {
        const limit = options?.limit || 100;
        const filter = options?.filter || '*'; // Default: all content

        plugin.emit('content:scan-start', { filter, limit });

        // Get transport
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        let hasMore = true;
        let totalFetched = 0;
        let nextToken: string | undefined;

        while (hasMore) {
          plugin.emit('content:scan-batch', { nextToken, limit });

          try {
            // Build SegmentQL query (plain text body)
            // Format: * FROM content OR FILTER <condition> FROM content
            // Note: '*' means "all", so don't prepend FILTER keyword
            const segmentQL = filter === '*' ? '* FROM content' : `FILTER ${filter} FROM content`;

            // Use /api/segment/scan with ad-hoc SegmentQL query
            // The API expects SegmentQL as plain text in the request body
            const response = await transport.postPlainText<{
              data: ContentEntity[];
              next?: string;
            }>('/api/segment/scan', segmentQL, { limit, start: nextToken });

            const entities = response.data || [];

            if (entities.length === 0) {
              hasMore = false;
              break;
            }

            totalFetched += entities.length;

            plugin.emit('content:scan-batch-received', {
              count: entities.length,
              total: totalFetched,
            });

            yield entities;

            // Check for next page token
            if (response.next) {
              nextToken = response.next;
            } else {
              hasMore = false;
            }
          } catch (error: any) {
            plugin.emit('content:scan-error', { error: error.message });
            throw new Error(`Content scan failed: ${error.message}`);
          }
        }

        plugin.emit('content:scan-complete', { total: totalFetched });
      },

      /**
       * Scan a saved content segment by ID or slug
       *
       * Returns an async generator that yields batches of content entities.
       * Uses `/api/segment/{segmentId}/scan` for saved segments created in Lytics.
       *
       * @param segmentId - Segment ID or slug (e.g., 'all_documents', 'blog_articles')
       * @param options - Scan options (limit, fields)
       * @returns Async generator yielding content entity batches
       *
       * @example
       * ```typescript
       * // Scan all documents (Lytics creates this automatically)
       * for await (const batch of lio.content.scanSegment('all_documents')) {
       *   console.log(`Got ${batch.length} entities`);
       * }
       *
       * // Scan custom content segment
       * for await (const batch of lio.content.scanSegment('blog_articles', { limit: 50 })) {
       *   for (const entity of batch) {
       *     console.log(entity.url, entity.title);
       *   }
       * }
       *
       * // Export all high-performing content
       * const allContent = [];
       * for await (const batch of lio.content.scanSegment('high_performing_content')) {
       *   allContent.push(...batch);
       * }
       * await exportToContentful(allContent);
       * ```
       */
      async *scanSegment(
        segmentId: string,
        options?: SavedSegmentScanOptions
      ): AsyncGenerator<ContentEntity[], void, undefined> {
        if (!segmentId) {
          throw new Error('Segment ID is required');
        }

        const limit = options?.limit || 100;

        plugin.emit('content:scan-segment-start', { segmentId, limit });

        // Get transport
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        let hasMore = true;
        let totalFetched = 0;
        let nextToken: string | undefined;

        while (hasMore) {
          plugin.emit('content:scan-segment-batch', { segmentId, nextToken, limit });

          try {
            // Use /api/segment/{segmentId}/scan for saved segments
            const response = await transport.get<{ data: ContentEntity[]; next?: string }>(
              `/api/segment/${segmentId}/scan`,
              { limit, start: nextToken }
            );

            const entities = response.data || [];

            if (entities.length === 0) {
              hasMore = false;
              break;
            }

            totalFetched += entities.length;

            plugin.emit('content:scan-segment-batch-received', {
              segmentId,
              count: entities.length,
              total: totalFetched,
            });

            yield entities;

            // Check for next page token
            if (response.next) {
              nextToken = response.next;
            } else {
              hasMore = false;
            }
          } catch (error: any) {
            plugin.emit('content:scan-segment-error', { segmentId, error: error.message });
            throw new Error(`Content segment scan failed for '${segmentId}': ${error.message}`);
          }
        }

        plugin.emit('content:scan-segment-complete', { segmentId, total: totalFetched });
      },
    } as ContentPlugin,
  });
};
