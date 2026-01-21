import type { Config, PluginFunction, SDK } from '@lytics/sdk-kit';

// Import core plugin types to access their methods
type WorkflowsPlugin = {
  list(options?: { workflow?: string }): Promise<any[]>;
};

type ContentPlugin = {
  getByUrl(url: string): Promise<any>;
  scan(options?: any): AsyncGenerator<any[], void, undefined>;
};

type LioSDK = SDK & {
  workflows: WorkflowsPlugin;
  content: ContentPlugin;
};

/**
 * Contentstack plugin for lio-client
 *
 * Monitors Contentstack sync workflows and enriches CMS entries with Lytics data.
 *
 * @example
 * ```typescript
 * import { createLioClient } from '@lytics/lio-client';
 * import { contentstackPlugin } from '@lytics/lio-client-contentstack';
 *
 * const lio = createLioClient({
 *   apiKey: process.env.LYTICS_API_KEY,
 *   plugins: [contentstackPlugin]
 * });
 *
 * await lio.init();
 *
 * // Check sync status
 * const status = await lio.contentstack.getSyncStatus();
 *
 * // Enrich an entry
 * const enriched = await lio.contentstack.enrich(blogPost);
 * console.log(enriched._lytics.topics);
 * ```
 */
export const contentstackPlugin: PluginFunction = (plugin, instance: SDK, config: Config) => {
  const sdk = instance as LioSDK;
  plugin.ns('contentstack');

  plugin.defaults({
    contentstack: {
      workflowName: 'contentstack-import',
      streamName: 'contentstack',
    },
  });

  plugin.expose({
    contentstack: {
      /**
       * Get contentstack_import workflow status
       *
       * @example
       * const status = await lio.contentstack.getSyncStatus();
       * console.log(`Last sync: ${status.lastSync}`);
       */
      async getSyncStatus() {
        const workflowName = config.get('contentstack.workflowName');
        const workflows = await sdk.workflows.list({ workflow: workflowName });

        if (!workflows.length) {
          return {
            status: 'not_configured' as const,
            lastSync: null,
            entriesSynced: 0,
            contentTypes: [],
          };
        }

        const workflow = workflows[0];
        return {
          status: workflow.status,
          lastSync: workflow.updated,
          entriesSynced: workflow.config?.entries_synced || 0,
          contentTypes: workflow.config?.content_types || [],
          workflowId: workflow.id,
        };
      },

      /**
       * Get Lytics enrichment data for a Contentstack entry
       *
       * @param entryOrUrl - Contentstack entry object or URL string
       *
       * @example
       * const lyticsData = await lio.contentstack.getEnrichmentData('https://example.com/blog/post');
       * console.log(lyticsData.lytics); // Topics
       */
      async getEnrichmentData(entryOrUrl: any) {
        const url = typeof entryOrUrl === 'string' ? entryOrUrl : entryOrUrl.url || entryOrUrl.href;

        if (!url) {
          throw new Error('Cannot extract URL from entry. Provide entry.url or a URL string.');
        }

        return await sdk.content.getByUrl(url);
      },

      /**
       * Scan all Contentstack content in Lytics
       *
       * @example
       * for await (const entry of lio.contentstack.scanContent()) {
       *   console.log(entry.url, entry.lytics);
       * }
       */
      async *scanContent(options = {}) {
        const streamName = config.get('contentstack.streamName');
        yield* sdk.content.scan({
          filter: `stream = "${streamName}"`,
          ...options,
        });
      },

      /**
       * Get content analytics for Contentstack entries
       *
       * @example
       * const analytics = await lio.contentstack.getAnalytics();
       * console.log(`Total entries: ${analytics.totalEntries}`);
       */
      async getAnalytics() {
        const stats = {
          byTopic: new Map<string, number>(),
          byContentType: new Map<string, number>(),
          totalEntries: 0,
        };

        for await (const entry of this.scanContent()) {
          stats.totalEntries++;

          if (entry.lytics) {
            for (const topic of Object.keys(entry.lytics)) {
              stats.byTopic.set(topic, (stats.byTopic.get(topic) || 0) + 1);
            }
          }

          if (entry.content_type) {
            stats.byContentType.set(
              entry.content_type,
              (stats.byContentType.get(entry.content_type) || 0) + 1
            );
          }
        }

        return {
          totalEntries: stats.totalEntries,
          topTopics: Array.from(stats.byTopic.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count })),
          contentTypes: Object.fromEntries(stats.byContentType),
        };
      },

      /**
       * Enrich a Contentstack entry with Lytics data
       *
       * @example
       * const entry = await csStack.entry('blt123').fetch();
       * const enriched = await lio.contentstack.enrich(entry);
       * console.log(enriched._lytics.topics);
       */
      async enrich<T extends Record<string, any>>(entry: T): Promise<T & { _lytics?: any }> {
        plugin.emit('contentstack:enrich', { entry });

        const url = entry.url || entry.href;
        if (!url) {
          return entry;
        }

        try {
          const lyticsData = await sdk.content.getByUrl(url);

          return {
            ...entry,
            _lytics: {
              topics: lyticsData.lytics,
              hashedurl: lyticsData.hashedurl,
              segments: lyticsData._segments,
              url: lyticsData.url,
            },
          };
        } catch (error) {
          plugin.emit('contentstack:enrich:error', { entry, error });
          return entry;
        }
      },

      /**
       * Enrich multiple Contentstack entries
       *
       * @example
       * const entries = await csStack.contentType('blog_post').query().find();
       * const enriched = await lio.contentstack.enrichMany(entries.entries);
       */
      async enrichMany<T extends Record<string, any>>(
        entries: T[]
      ): Promise<Array<T & { _lytics?: any }>> {
        plugin.emit('contentstack:enrich-many', { count: entries.length });

        return await Promise.all(entries.map((entry) => this.enrich(entry)));
      },
    },
  });
};
