import type { PluginFunction } from '@lytics/sdk-kit';

/**
 * Contentstack plugin for lio-client
 *
 * Provides CMS-specific enrichment functionality for Contentstack entries.
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
 * const enriched = await lio.contentstack.enrich(blogPost);
 * ```
 */
export const contentstackPlugin: PluginFunction = (plugin, _instance, _config) => {
  plugin.ns('contentstack');

  // Set defaults
  plugin.defaults({
    contentstack: {
      urlField: 'url', // Field in Contentstack entry containing the URL
    },
  });

  // Expose API
  plugin.expose({
    contentstack: {
      /**
       * Enrich a single Contentstack entry with Lytics data
       * TODO: Implement using content plugin
       */
      async enrich<T extends Record<string, any>>(entry: T): Promise<T & { _lytics?: any }> {
        plugin.emit('contentstack:enrich', { entry });

        // TODO: Get URL from entry, query Lytics, attach data
        throw new Error('Not yet implemented - coming soon!');
      },

      /**
       * Enrich multiple Contentstack entries with Lytics data
       * TODO: Implement using content scan
       */
      async enrichMany<T extends Record<string, any>>(
        entries: T[]
      ): Promise<Array<T & { _lytics?: any }>> {
        plugin.emit('contentstack:enrich-many', { count: entries.length });

        // TODO: Batch enrich using scan method
        throw new Error('Not yet implemented - coming soon!');
      },
    },
  });
};
