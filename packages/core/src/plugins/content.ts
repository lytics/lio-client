/**
 * Content Plugin
 *
 * Provides access to Lytics content enrichment data:
 * - Get content entity by URL
 * - Scan content table (bulk queries)
 * - Topics extraction from entity.lytics field
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type {
  ContentAlignment,
  ContentAlignOptions,
  ContentEnrichResult,
  ContentEntity,
  ContentOpportunityOptions,
  ContentPlugin,
  OpportunityTopic,
} from '../types';
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
            // Format: FILTER <condition> FROM content (wildcard '*' still needs FILTER keyword)
            const segmentQL = `FILTER ${filter} FROM content`;

            // Use /api/segment/scan with ad-hoc SegmentQL query
            // The API expects SegmentQL as plain text in the request body
            const response = await transport.post<{
              data: ContentEntity[];
              _next?: string;
            }>(
              '/api/segment/scan',
              segmentQL,
              { limit, start: nextToken },
              { contentType: 'text/plain', unwrap: false }
            );

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

            // Check for next page token (Lytics uses _next)
            if (response._next) {
              nextToken = response._next;
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
      /**
       * Enrich text or URL with Lytics content topics
       *
       * @param input - Text or URL to enrich (provide one)
       * @returns Enrichment result with topic scores
       *
       * @example
       * ```typescript
       * const result = await lio.content.enrich({ text: 'Blog post about coffee...' });
       * console.log(result.topics); // { "Coffee": 0.85, "Wellness": 0.72 }
       * ```
       */
      async enrich(input: { text?: string; url?: string }): Promise<ContentEnrichResult> {
        if (!input.text && !input.url) {
          throw new Error('Either text or url is required');
        }

        plugin.emit('content:enrich', { hasText: !!input.text, hasUrl: !!input.url });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const formData = new URLSearchParams();
        if (input.text) formData.set('text', input.text);
        if (input.url) formData.set('url', input.url);

        const response = await transport.post<ContentEnrichResult>(
          '/v2/content/enrich',
          formData.toString(),
          undefined,
          { contentType: 'application/x-www-form-urlencoded' }
        );

        plugin.emit('content:enriched', {
          topicCount: Object.keys(response.topics ?? {}).length,
        });

        return response;
      },

      /**
       * Align topics against audience segments
       *
       * Given a set of topic scores (e.g. from enrich), returns the most
       * relevant audience segments ranked by alignment score.
       *
       * @param topics - Topic scores to align (e.g. from enrich result)
       * @param options - Alignment options (method, limit)
       * @returns Segments ranked by alignment score
       *
       * @example
       * ```typescript
       * const enriched = await lio.content.enrich({ text: '...' });
       * const segments = await lio.content.align(enriched.topics, { limit: 5 });
       * for (const s of segments) {
       *   console.log(`${s.segment_name}: ${s.alignment}`);
       * }
       * ```
       */
      async align(
        topics: Record<string, number>,
        options?: ContentAlignOptions
      ): Promise<ContentAlignment[]> {
        if (!topics || Object.keys(topics).length === 0) {
          throw new Error('Topics are required');
        }

        plugin.emit('content:align', { topicCount: Object.keys(topics).length });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string | number> = {};
        if (options?.method) params.method = options.method;
        if (options?.limit) params.limit = options.limit;

        const response = await transport.post<ContentAlignment[]>(
          '/v2/content/align',
          { topics },
          params
        );

        plugin.emit('content:aligned', { segmentCount: response.length });

        return response;
      },
      /**
       * Fetch content opportunity topics
       *
       * @param options - Options (date filter)
       * @returns Array of opportunity topics with dimensions and segments
       */
      async opportunity(options?: ContentOpportunityOptions): Promise<OpportunityTopic[]> {
        plugin.emit('content:opportunity', { options });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string> = {};
        if (options?.date) params.date = options.date;

        const response = await transport.get<{ topics: OpportunityTopic[] }>(
          '/v2/content/opportunity',
          Object.keys(params).length > 0 ? params : undefined
        );

        const topics = response.topics ?? [];

        plugin.emit('content:opportunity-received', { count: topics.length });

        return topics;
      },
    } as ContentPlugin,
  });
};
